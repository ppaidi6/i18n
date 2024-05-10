ARG DCNMGODEV
ARG IMAGEREGISTRY
ARG DCNM_BASE_GOPY_REPO
ARG DCNM_BASE_GOPY_VERSION
ARG IMAGE_TYPE=final
FROM $IMAGEREGISTRY/dcnm-go-dev:$DCNMGODEV as godev

ENV BUILD_ROOT=/build-root
COPY src/service/ $BUILD_ROOT/l4l7
COPY src/service/cmd/openapi3.json /bin/
WORKDIR $BUILD_ROOT/l4l7

ARG IMAGE_TYPE
RUN echo "Building $IMAGE_TYPE image"
RUN set -e; \
    if [ "$IMAGE_TYPE" = "dbg" ]; then \
        go test -v --ldflags '-extldflags "-static"' -coverprofile=cover.txt -c -o /bin/l4l7 ./cmd -vet=off -coverpkg l4l7/impl,l4l7/db,l4l7/httpcl,l4l7/logger,l4l7/rest,l4l7/services,l4l7/settings,l4l7/stats,l4l7/types,l4l7/utils; \
    else \
        build.sh ./cmd; cp cmd.bin /bin/l4l7; \
    fi

FROM $DCNM_BASE_GOPY_REPO/nexus/dcnm-base-gopy:$DCNM_BASE_GOPY_VERSION

COPY --from=0 /bin/l4l7 /bin/
COPY --from=0 /bin/openapi3.json /etc/dcnm/rbac/yaml/

RUN mkdir -p /var/dcnm/applogs

#static analysis
COPY sonarqube_run.sh /root/sonarqube_run.sh
ARG SA
RUN if [ "x$SA" = "x" ] ; then echo Static Analysis Argument not provided ; else /root/sonarqube_run.sh $SA ; fi

WORKDIR /etc/dcnm/rbac/yaml
COPY install/dcnm/rbac/json/gen-api-routes.json /etc/dcnm/rbac/api-routes.json
COPY yaml/routes/*.yaml /etc/dcnm/rbac/yaml/
ENV RBAC_ROUTE_FILE="/etc/dcnm/rbac/api-routes.json"

ENV LOG_FILE_COUNT="10"
ENV LOG_FILE_SIZE="10485760"
ENV LOG_APP_NAME="l4l7-service"
ENV LOG_LEVEL="LOGGER_LEVEL_INFO"
ENV LOG_BASE_DIR="/var/log/l4l7-service"

ENV BIN_CMD="/bin/l4l7"
ENV BIN_TEST_CMD="/bin/l4l7 -test.coverprofile /tmp/cover.txt"

ARG IMAGE_TYPE
ENV IMAGE_TYPE=$IMAGE_TYPE
