/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect } from 'react';
import { t } from 'ttag'
import { get } from 'lodash';
import { useSelector } from 'react-redux';
import { NFT_LIST_PER_PAGE } from '../constants';
import { TOKEN_DOWNLOAD_STATUS } from '../constants';
import HathorPaginate from '../components/HathorPaginate';
import NFTListElement from '../components/NFTListElement';
import BackButton from '../components/BackButton';


/**
 * Retrieves NFT data from the given redux state object.
 *
 * @param {object} state - The application redux state object
 * @returns {{nftData: Array}} - The retrieved NFT data.
 */
function retrieveNftDataFromState(state) {
  const tokenMetadata = state.tokenMetadata || {};
  const nftList = Object.values(tokenMetadata).filter((meta) => {
    return meta.nft_media && meta.nft_media.file;
  });

  const tokenConfigByUid = {};
  for (const token of state.tokens) {
    tokenConfigByUid[token.uid] = token;
  }

  const nftData = nftList.map((meta) => {
    const tokenConfig = tokenConfigByUid[meta.id];
    const tokenBalance = get(state.tokensBalance, meta.id, {
      status: TOKEN_DOWNLOAD_STATUS.LOADING,
      data: {
        available: 0n,
        locked: 0n,
      },
    });

    return {
      name: tokenConfig.name,
      symbol: tokenConfig.symbol,
      balance: tokenBalance,
      ...meta,
    };
  });

  return {
    nftData,
  };
}

/**
 * List all NFTs with explorer asset
 *
 * @memberof Screens
 */
function NFTList() {
  /**
   * page: {Number} Current page of the list
   * `page` is 1-indexed, i.e. `page=1` means the first page and `page=0` is invalid.
   * totalPages: {Number} Total number of pages of the list
   */
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const { nftData } = useSelector(retrieveNftDataFromState);

  useEffect(() => {
    setTotalPages(getTotalPages());
  }, []);

  /**
   * Return total number of pages of the list
   *
   * @return {Number} Total number of pages of the list
   */
  const getTotalPages = () => {
    return Math.ceil(nftData.length / NFT_LIST_PER_PAGE);
  }

  /**
   * Event received from pagination component after a page button in clicked
   *
   * @param data {Object} Data with clicked page {'selected'}.
   * `selected` is 0-indexed, i.e. `selected=0` means the first page.
   */
  const handlePageClick = (data) => {
    const selectedPage = data.selected + 1;
    setPage(selectedPage);
  }

  const renderList = () => {
    if (nftData.length === 0) {
      return <p>{t`Your list is empty.`}</p>
    }

    const startIndex = (page - 1) * NFT_LIST_PER_PAGE;
    const endIndex = startIndex + NFT_LIST_PER_PAGE;
    return nftData.slice(startIndex, endIndex).map((nftElement) => {
      return (
        <div key={nftElement.id}>
          <NFTListElement nftElement={nftElement} />
        </div>
      );
    });
  }

  const loadPagination = () => {
    if (nftData.length === 0 || totalPages === 1) {
      return null;
    } else {
      return (
        <HathorPaginate pageCount={totalPages}
          onPageChange={handlePageClick} />
      );
    }
  }

  return (
    <div className="content-wrapper">
      <BackButton />
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

export default NFTList;
