/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import BackButton from '../../components/BackButton';

/**
 * List of blueprints
 *
 * @memberof Screens
 */
class BlueprintList extends React.Component {
  /**
   * Method executed when link to go to blueprint page
   *
   * @param {Object} e Event emitted by the link clicked
   * @param {String} blueprint Blueprint ID
   */
  goToNanoContract = (e, blueprint) => {
    e.preventDefault();
    this.props.history.push(`/blueprint/${blueprint}/`);
  }

  render() {
    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <h3 className="mt-4">{t`Blueprint List`}</h3>
        <a href="true" onClick={(e) => this.goToNanoContract(e, '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595')} className="mt-3 ">{t`Bet`}</a>
      </div>
    );
  }
}

export default BlueprintList;