import React from 'react';
import PropTypes from 'prop-types';
import {BpExclamationCircle, PhCheckCircleFill} from '@bui/icons';
import {CollapsiblePanel} from 'components';
import {convertUTCToLocalTime} from 'helpers/responseParsers';

import styles from './AllSummaryPaneContent.scss';

export default class BackupsSummaryPaneContent extends React.Component {
  render() {
    const {data} = this.props;
    const isRemote = data.location.locationType === 'remote';
    const date = convertUTCToLocalTime(data.timestamp).format('MMM D, YYYY');
    const time = convertUTCToLocalTime(data.timestamp).format('h:mm A');
    return (
      <CollapsiblePanel id="general" title="General">
        <div className={styles.panelContent}>
          <div className={styles.property}>
            <label>Date</label>
            <div className={styles.value}>{`${time}-${date}`}</div>
          </div>
          <div className={styles.property}>
            <label>Size(kB)</label>
            <div className={styles.value}>{data.backupEntry.sizeKB}</div>
          </div>
          <div className={styles.property}>
            <label>Location Type</label>
            <div className={styles.value}>{data.location.locationType}</div>
          </div>
          {isRemote ? (
            <React.Fragment>
              <div className={styles.property}>
                <label>Remote Location Name</label>
                <div className={styles.value}>{data.remoteLocationName}</div>
              </div>
              <div className={styles.property}>
                <label>Path</label>
                <div className={styles.value}>{data.location.path}</div>
              </div>
            </React.Fragment>
          ) : null}
          <div className={styles.property}>
            <label>Notes</label>
            <div className={styles.value}>{data.notes ? data.notes : '-'}</div>
          </div>
          <div className={styles.property}>
            <label>Status</label>
            <div className={styles.value}>
              <span>
                {data?.status?.statusType === 'failure' ? (
                  <BpExclamationCircle color="warning" />
                ) : (
                  <PhCheckCircleFill color="success" />
                )}{' '}
              </span>
            </div>
          </div>
        </div>
      </CollapsiblePanel>
    );
  }
}

BackupsSummaryPaneContent.propTypes = {
  data: PropTypes.object,
  apiActions: PropTypes.object,
};
