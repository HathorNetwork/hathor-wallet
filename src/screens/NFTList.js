/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import BackButton from '../components/BackButton';
import { NFT_LIST_PER_PAGE } from '../constants';
import HathorPaginate from '../components/HathorPaginate';
import NFTListElement from '../components/NFTListElement';
import helpers from '../utils/helpers';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  const registeredTokens = state.tokens;
  const tokenMetadata = state.tokenMetadata || {};
  const nftList = Object.values(tokenMetadata).filter((meta) => {
    const hasNFTMedia = meta.nft_media && meta.nft_media.file;
    const isRegistered = state.tokens.find((registeredToken) => registeredToken.uid === meta.id);
    return hasNFTMedia && isRegistered;
  });

  const nftData = nftList.map((meta) => {
    const tokenConfig = state.tokens.find((registeredToken) => registeredToken.uid === meta.id);
    const balance = state.tokensBalance[meta.id] || { available: 0 };
    return {
      name: tokenConfig.name,
      symbol: tokenConfig.symbol,
      balance: balance.available,
      ...meta,
    };
  });

  return {
    nftData,
  };
};

/**
 * List all NFTs with explorer asset
 *
 * @memberof Screens
 */
class NFTList extends React.Component {
  /**
   * page: {Number} Current page of the list
   * totalPages: {Number} Total number of pages of the list
   */
  state = {
    page: 1,
    totalPages: 0,
  }

  componentDidMount() {
    this.setState({ totalPages: this.getTotalPages() });
  }

  /**
   * Return total number of pages of the list
   *
   * @return {Number} Total number of pages of the list
   */
  getTotalPages = () => {
    return Math.ceil(this.props.nftData.length / NFT_LIST_PER_PAGE);
  }

  /**
   * Event received from pagination component after a page button in clicked
   *
   * @param data {Object} Data with clicked page {'selected'}
   */
  handlePageClick = (data) => {
    const page = data.selected + 1;
    this.setState({ page });
  }

  render = () => {
    const renderList = () => {
      if (this.props.nftData.length === 0) {
        return <p>{t`Your list is empty.`}</p>
      }

      const startIndex = (this.state.page - 1) * NFT_LIST_PER_PAGE;
      const endIndex = startIndex + NFT_LIST_PER_PAGE;
      return this.props.nftData.slice(startIndex, endIndex).map((nftElement) => {
        return (
          <div key={nftElement.id}>
            <NFTListElement nftElement={nftElement} />
          </div>
        );
      });
    }

    const loadPagination = () => {
      if (this.props.nftData.length === 0 || this.state.totalPages === 1) {
        return null;
      } else {
        return (
          <HathorPaginate pageCount={this.state.totalPages}
            onPageChange={this.handlePageClick} />
        );
      }
    }

    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <div className="d-flex flex-column mb-3">
          <h3 className="mt-4">NFT List</h3>
          <p className="mt-5">{t`This list will have all the registered NFTs that you have balance and that have a digital asset being shown in our explorer.`}</p>
          <div className="d-flex flex-row flex-wrap justify-content-between mb-3">
            {renderList()}
          </div>
          {loadPagination()}
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps)(NFTList);