import React from 'react';
import ModalBackupWords from '../components/ModalBackupWords';
import $ from 'jquery';


class NewWalletStep2 extends React.Component {
  backupLater = () => {
    this.props.backupLater();
  }

  backupNow = () => {
    $('#backupWordsModal').modal('show');
  }

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
