package com.tetration.processanalytics.pipeline.analytics.function;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.io.BaseEncoding;
import com.mongodb.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.UpdateOneModel;
import com.mongodb.client.model.UpdateOptions;
import com.mongodb.client.model.WriteModel;
import com.tetration.processanalytics.mongolib.MongoConnect;
import com.tetration.processanalytics.pipeline.common.BatchUtil;
import com.tetration.processanalytics.pipeline.common.LazyLogger;
import com.tetration.processanalytics.pipeline.common.Utils;
import com.tetration.processanalytics.pipeline.snapshot.SnapshotCounters;
import com.tetration.processanalytics.proto.AnomalyFileHashInfoProto.BinaryHashInfo;
import com.tetration.processanalytics.proto.FileHashRestProto.AnomalyHashSummaryCollection;
import com.tetration.processanalytics.proto.FileHashRestProto.SensorBatchFileHashInfo;
import com.tetration.processanalytics.pslib.dblayer.MongoCollectionBulkWriter;
import com.tetration.processanalytics.psmongo.ProcessSnapshotMongoDbCredential;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.commons.lang.exception.ExceptionUtils;
import org.apache.spark.api.java.function.VoidFunction;
import org.bson.Document;
import org.bson.conversions.Bson;
import scala.Tuple2;

/**
 * Function at executor to write to file-hash time series mongo collection
 */

public class WriteSensorMongoFileHashFunction implements Serializable,
    VoidFunction<Iterator<Tuple2<String, byte[]>>> {

  private static final LazyLogger log =
      LazyLogger.getLogger(WriteSensorMongoFileHashFunction.class);

  /**
   * Field names of the file-hash time series collection
   */
  public static class FieldNames {
    public static final String sensorId = "sid";
    public static final String rootScopeId = "rsid";
    public static final String batchDate = "date";
    public static final String hashValue = "hash";
    public static final String filePath = "path";
    public static final String packageVersion = "pkg";
    public static final String hashRefInfo = "ref";
    public static final String sha1Value = "sha1";
    public static final String showAt = "at";
    public static final String hourOfDay = "h";
    public static final String anomalyScore = "s";
    public static final String atDotHour = showAt + '.' + hourOfDay;
    public static final String anomalyHashSummary = "summ";
    public static final String isLibrary = "lib";
    public static final String loadedBy = "ldby";
    public static final String procHash = "ph";
  }

  public static final String FH_TIME_SERIES_COLLECTION = "file_hash_time_series";
  private static final UpdateOptions UPDATE_OPTIONS_UPSERT = new UpdateOptions().upsert(true);

  private static transient MongoClient mongoClient;
  private static transient MongoDatabase database;
  private static transient MongoCollection<Document> collection;
  private final ProcessSnapshotMongoDbCredential creds;

  private final int mongoBulkWriteMaxNumberDocuments;
  private final SnapshotCounters counters;

  public WriteSensorMongoFileHashFunction(
      ProcessSnapshotMongoDbCredential creds,
      int mongoBulkWriteMaxNumberDocuments,
      SnapshotCounters counters) {
    this.creds = creds;
    this.mongoBulkWriteMaxNumberDocuments = mongoBulkWriteMaxNumberDocuments;
    this.counters = counters;
  }

  @Override
  public void call(Iterator<Tuple2<String, byte[]>> iterator) throws Exception {
    // If mongo connection is not successful, exception will be thrown and the job will fail
    long startTime = System.currentTimeMillis();
    connectToMongoIfNeeded();
    log.info("file-hash time series mongo conn time {}", System.currentTimeMillis() - startTime);
    startTime = System.currentTimeMillis();

    List<WriteModel<Document>> documents =
        Utils.asStream(iterator, false)
            .parallel()
            .flatMap(this::getFileHashTimeSeriesDocument)
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    log.info("file-hash times series mongo doc preparation time {}",
        System.currentTimeMillis() - startTime);
    startTime = System.currentTimeMillis();

    try {
      MongoCollectionBulkWriter writer =
          new MongoCollectionBulkWriter(collection, mongoBulkWriteMaxNumberDocuments);
      MongoCollectionBulkWriter.BulkResult results = writer.bulkWrite(documents);
      log.info("file-hash times series mongo write time {}",
          System.currentTimeMillis() - startTime);

      counters.numFileHashTimeSeriesMongoFailedWrite.add(results.failureCount);
      counters.numFileHashTimeSeriesMongoException.add(results.mongoExceptionCount);
      counters.numFileHashTimeSeriesMongoUpsert.add(results.upsertCount);
      counters.numFileHashTimeSeriesMongoDelete.add(results.deleteCount);
      counters.numFileHashTimeSeriesMongoInsert.add(results.insertCount);
      counters.numFileHashTimeSeriesMongoUpdate.add(results.updateCount);
      counters.numFileHashTimeSeriesMongoMatched.add(results.matchedCount);
    } catch (Exception e) {
      // Catch anything that is unexpected from mongo write
      log.error("file-hash times series mongo bulk write exception: {}",
          ExceptionUtils.getStackTrace(e));
      counters.numFileHashTimeSeriesMongoWriteTotalFailure.add(1);
    }
  }

  private Stream<WriteModel<Document>> getFileHashTimeSeriesDocument(
      Tuple2<String, byte[]> sensorHashInfo) {
    try {
      SensorBatchFileHashInfo sbhInfo = SensorBatchFileHashInfo.parseFrom(sensorHashInfo._2());

      byte[] sensorId = BaseEncoding.base16().lowerCase().decode(sbhInfo.getSensorId());
      byte[] rootScopeId = BaseEncoding.base16().lowerCase().decode(sbhInfo.getRootScopeId());
      String batch = sbhInfo.getBatch();
      String batchDate = BatchUtil.getDate(batch);
      String hourOfDay = BatchUtil.getHour(batch);

      return sbhInfo.getHashInfoCollection().getHashInfoList().stream()
          .map(fhInfo -> {
            byte[] hashValue = BaseEncoding.base16().lowerCase().decode(fhInfo.getHashValue());
            String filePath = fhInfo.getFilePath();
            String packageVersion = fhInfo.getPackageVersion();
            byte[] hashRefInfo = fhInfo.getRefInfo().toByteArray();

            Bson filter = Filters.and(
                Filters.eq(FieldNames.hashValue, hashValue),
                Filters.eq(FieldNames.sensorId, sensorId),
                Filters.eq(FieldNames.batchDate, batchDate),
                Filters.eq(FieldNames.rootScopeId, rootScopeId),
                Filters.eq(FieldNames.filePath, filePath),
                Filters.eq(FieldNames.hashRefInfo, hashRefInfo),
                Filters.eq(FieldNames.packageVersion, packageVersion)
            );

            Document setOnInsertDoc = new Document();
            setOnInsertDoc.put(FieldNames.sensorId, sensorId);
            setOnInsertDoc.put(FieldNames.rootScopeId, rootScopeId);
            setOnInsertDoc.put(FieldNames.batchDate, batchDate);
            setOnInsertDoc.put(FieldNames.hashValue, hashValue);
            setOnInsertDoc.put(FieldNames.filePath, filePath);
            setOnInsertDoc.put(FieldNames.hashRefInfo, hashRefInfo);
            setOnInsertDoc.put(FieldNames.packageVersion, packageVersion);
            setOnInsertDoc.put(FieldNames.sha1Value,
                BaseEncoding.base16().lowerCase().decode(fhInfo.getSha1Value()));
            if (fhInfo.getIsLibrary()) {
              setOnInsertDoc.put(FieldNames.isLibrary, true);
            }

            Document showAtDoc = new Document();
            showAtDoc.put(FieldNames.hourOfDay, Integer.parseInt(hourOfDay));
            showAtDoc.put(FieldNames.anomalyScore, fhInfo.getAnomalyScore());
            if (fhInfo.getIsLibrary()) {
              List<Document> loadedByDoc = new ArrayList<>();
              for (BinaryHashInfo loadedByInfo : fhInfo.getLoadedByList()) {
                byte[] pHash = BaseEncoding.base16().lowerCase().decode(loadedByInfo.getSha256());
                loadedByDoc.add(new Document(FieldNames.procHash, pHash));
              }
              showAtDoc.put(FieldNames.loadedBy, loadedByDoc);
            }
            if (fhInfo.getAnomalyHashSummaryCount() > 0) {
              byte[] hashInfoSummary = AnomalyHashSummaryCollection.newBuilder()
                  .addAllHashInfoSummary(fhInfo.getAnomalyHashSummaryList()).build().toByteArray();
              showAtDoc.put(FieldNames.anomalyHashSummary, hashInfoSummary);
            }
            Document pushDoc = new Document(FieldNames.showAt, showAtDoc);

            Document timeSeriesDoc = new Document();
            timeSeriesDoc.put("$setOnInsert", setOnInsertDoc);
            timeSeriesDoc.put("$push", pushDoc);

            return new UpdateOneModel<>(filter, timeSeriesDoc, UPDATE_OPTIONS_UPSERT);
          });

    } catch (Exception ex) {
      log.error("Exception when getting file-hash time series doc: {}",
          ExceptionUtils.getStackTrace(ex));
      return Stream.empty();
    }
  }

  private void connectToMongoIfNeeded() {
    if (mongoClient == null || database == null || collection == null) {
      mongoClient = MongoConnect.attemptConnectMongoDb(creds, false /* async */);
      database = MongoConnect.attemptGetDatabase(mongoClient, creds.dbName());
      collection = MongoConnect.attemptGetCollection(database, FH_TIME_SERIES_COLLECTION);
    }
  }

  @VisibleForTesting
  public static boolean close() {
    if (mongoClient == null) {
      log.info("Tried to close mongodb but mongoClient is null, no-op");
      return true;
    }
    try {
      log.info("Closing mongodb connection...");
      mongoClient.close();
      mongoClient = null;
    } catch (Exception e) {
      log.error("Failed to close mongodb connection -- error: {}", e.getMessage());
      return false;
    }
    return true;
  }
}
