/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ModalBackupWords from '../components/ModalBackupWords';
import $ from 'jquery';


/**
 * Component that shows the step2 of a new wallet with a warning message and possibility to do the words backup now or later
 *
 * @memberof Components
 */
class NewWalletStep2 extends React.Component {
  /**
   * When user decides to do the backup later
   */
  backupLater = () => {
    this.props.backupLater();
  }

  /**
   * When user decides to do the backup now (opens backup modal)
   */
  backupNow = () => {
    $('#backupWordsModal').modal('show');
  }

  /**
   * When user has success doing the validation backup
   */
  validationSuccess = () => {
    $('#backupWordsModal').on('hidden.bs.modal', (e) => {
      this.props.validationSuccess();
    });
    $('#backupWordsModal').modal('hide');
  }

  render() {
    return (
      <div className="d-flex align-items-start flex-column">
        <p className="mt-4">Your words have been created!</p>
        <p className="mb-4">You should save them in a non-digital media, such as a piece of paper. We advise you to do it now, but you can do it later.</p>
        <div className="d-flex justify-content-between flex-row w-100">
          <button onClick={this.props.back} type="button" className="btn btn-secondary">Back</button>
          <button onClick={this.backupLater} type="button" className="btn btn-secondary">Do it later</button>
          <button onClick={this.backupNow} type="button" className="btn btn-hathor">Backup now</button>
        </div>
        <ModalBackupWords needPassword={false} validationSuccess={this.validationSuccess} />
      </div>
    )
  }
}

export default NewWalletStep2;
