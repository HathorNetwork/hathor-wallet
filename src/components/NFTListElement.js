/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import { NFT_MEDIA_TYPES, VIDEO_MEDIA_TYPES_BY_EXTENSION, AUDIO_MEDIA_TYPES_BY_EXTENSION } from '../constants';
import helpers from '../utils/helpers';


/**
 * Show a NFT element in the NFT list
 *
 * @memberof Components
 */
class NFTListElement extends React.Component {
  /**
   * Method called when user clicked on 'See on explorer'
   * Go to explorer token detail page
   *
   * @param {Object} e Event for the click
   * @param {String} token Token uid
   */
  goToTokenDetail = (e, token) => {
    e.preventDefault();
    const url = helpers.getFullExplorerURL(`token_detail/${token}`);
    helpers.openExternalURL(url);
  }

  render = () => {
    const nftType = this.props.nftElement.nft_media.type && this.props.nftElement.nft_media.type.toUpperCase();

    const file = this.props.nftElement.nft_media.file;

    const ext = helpers.getFileExtension(file);

    let fileType;

    if (nftType === NFT_MEDIA_TYPES.audio) {
      fileType = AUDIO_MEDIA_TYPES_BY_EXTENSION[ext];
    }

    if (nftType === NFT_MEDIA_TYPES.video) {
      fileType = VIDEO_MEDIA_TYPES_BY_EXTENSION[ext];
    }

    let media;

    if (nftType === NFT_MEDIA_TYPES.image) {
      media = <img src={file} width="100%" height="100%" alt="NFT Preview" />;
    } else if (nftType === NFT_MEDIA_TYPES.video && fileType) {
      media = (
        <video
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          loop={this.props.nftElement.nft_media.loop}
        >
          <source src={file} type={fileType} />
          Your browser does not support html video tag.
        </video>
      )
    } else if (nftType === NFT_MEDIA_TYPES.audio && fileType) {
      media = (
        <audio
          controls
          controlsList="nodownload"
          loop={this.props.nftElement.nft_media.loop}
        >
          <source src={file} type={fileType} />
          Your browser does not support the audio element.
        </audio>
      )
    } else if (nftType === NFT_MEDIA_TYPES.pdf) {
      // Toolbar to prevent showing download/print icons
      const data = `${file}#toolbar=0`;
      media = <object data={data} width="100%" height="100%" type="application/pdf" alt="NFT Preview" aria-label="NFT Preview" />;
    } else {
      media = <p> Preview Unavailable </p>
    }

    return (
      <>
        <div className='d-flex align-items-lg-stretch mt-4 mt-lg-0'>
          <div className="d-flex flex-column token-nft-preview mt-5">
            <p><strong>{this.props.nftElement.name}</strong></p>
            <figure className="figure flex-fill p-4 d-flex align-items-center justify-content-center">
              { media }
            </figure>
            <p><strong>Balance: </strong>{helpers.renderValue(this.props.nftElement.balance, true)} {this.props.nftElement.symbol}</p>
            <p><a href="true" onClick={(e) => this.goToTokenDetail(e, this.props.nftElement.id)}>{t`See on explorer`}</a></p>
          </div>        
        </div>
      </>
    )
  }
}

export default NFTListElement;
