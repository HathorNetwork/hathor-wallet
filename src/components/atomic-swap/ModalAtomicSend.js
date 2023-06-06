/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useRef, useState } from "react";
import { t } from "ttag";
import InputNumber from "../InputNumber";
import hathorLib, { Address } from "@hathor/wallet-lib";
import { translateTxToProposalUtxo } from "../../utils/atomicSwap";
import { TOKEN_DOWNLOAD_STATUS } from "../../sagas/tokens";
import { get } from 'lodash';
import Loading from "../Loading";
import helpers from "../../utils/helpers";
import { decimalToInteger } from '../../utils/wallet';

function UtxoRow ({ wallet, utxo, token, utxoChanged, showAddButton, addButtonHandler, setErrMessage }) {
    const [txId, setTxId] = useState(utxo.tx_id || '');
    const [outputIndex, setOutputIndex] = useState(utxo.index || '');
    const [amount, setAmount] = useState('');
    const [isInvalid, setIsInvalid] = useState(false);

    const raiseInvalidInputError = () => {
        setAmount('');
        setIsInvalid(true);
        setErrMessage(t`Invalid input for this token`)
        utxoChanged({ txId, index: outputIndex, amount: 0, tokenId: '' });
    }

    const localDataChanged = async () => {
        // Data was removed completely
        if (txId.length === 0 && outputIndex.length === 0) {
            setAmount('');
            setErrMessage('');
            setIsInvalid(false);
            utxoChanged({});
            return;
        }

        // Avoid processing invalid inputs while they are being typed
        if (txId.length !== 64 || isNaN(parseInt(outputIndex))) {
            setAmount('');
            return;
        }

        // If no address can be found, this tx does not exist or is invalid for this wallet
        const tx = await wallet.getTx(txId);
        const utxo = tx?.outputs[outputIndex];
        const filterAddress = utxo?.decoded.address;
        if (!filterAddress) {
            raiseInvalidInputError();
        }
        const options = { token: token.uid, filter_address: filterAddress };
        const { utxos: validUtxos } = await wallet.getUtxos(options);

        const validUtxo = validUtxos.find(u => u.tx_id === txId && u.index === +outputIndex);
        if (!validUtxo) {
            raiseInvalidInputError();
            return;
        }

        const newAmount = validUtxo.amount;
        setAmount(helpers.renderValue(newAmount, false));
        setIsInvalid(false);
        setErrMessage('');
        utxoChanged(validUtxo);
    }

    useEffect(() => {
        localDataChanged();
    }, [txId, outputIndex]);

    return <div className="row mt-2">
        <input type="text"
               placeholder={t`Tx Id`}
               name="txId"
               value={txId}
               onChange={e => setTxId(e.target.value)}
               className={`form-control input-id mr-2 col-7 ${isInvalid && 'is-invalid'}`}
        />
        <input type="text"
               placeholder={t`Index`}
               name="outputIndex"
               value={outputIndex}
               onChange={e => setOutputIndex(e.target.value)}
               className={`form-control input-index mr-2 col-2 ${isInvalid && 'is-invalid'}`} />
        <span className="my-auto mx-1">{amount && `${amount} ${token.symbol}`}</span>
        {showAddButton && <button type="button" className="btn btn-hathor" onClick={addButtonHandler}>+</button>}
    </div>
}

function UtxoSelection ({ wallet, utxos, token, utxosChanged, setErrMessage }) {
    const addButtonHandler = () => {
        const lastUtxoIndex = utxos.length - 1;
        const lastUtxo = utxos[lastUtxoIndex];
        if (!lastUtxo.tx_id) {
            return; // Do not add while the last utxo is empty
        }

        // Add a new line
        utxosChanged({ utxos: [...utxos, {}] })
    }

    const utxoChanged = (changedArrayIndex, utxoData) => {
        const updatedUtxos = utxos.map((utxo, index) => {
            if (index !== changedArrayIndex) {
                return utxo; // Ignore all unchanged items
            }
            return utxoData;
        })

        utxosChanged({ utxos: updatedUtxos });
    }

    return utxos.map((utxo, listIndex) => <UtxoRow
        utxo={utxo}
        key={listIndex}
        wallet={wallet}
        token={token}
        showAddButton={listIndex === 0}
        addButtonHandler={addButtonHandler}
        utxoChanged={(utxoData) => utxoChanged(listIndex, utxoData)}
        setErrMessage={setErrMessage}
    />);
}

export function ModalAtomicSend ({ sendClickHandler, sendableTokens, tokenBalances, manageDomLifecycle, onClose, wallet }) {
    const [selectedToken, setSelectedToken] = useState(sendableTokens.length && sendableTokens[0]);
    const [changeAddress, setChangeAddress] = useState('');
    let amountRef = useRef();
    const [amount, setAmount] = useState(0);
    const [errMessage, setErrMessage] = useState('');
    const modalDomId = 'atomicSendModal';

    const [showUtxoSelection, setShowUtxoSelection] = useState(false);
    const [utxos, setUtxos] = useState([{}]);
    const [utxoError, setUtxoError] = useState(false);

    const getTokenBalanceById = (tokenUid) => get(
        tokenBalances,
        tokenUid,
        {
        status: TOKEN_DOWNLOAD_STATUS.LOADING,
        data: {
            available: 0,
            locked: 0,
        },
    }
    );
    const [selectedTokenBalance, setSelectedTokenBalance] = useState(
        getTokenBalanceById(selectedToken.uid)
        );

    const noTokensAvailable = !sendableTokens.length;
    const renderTokenOptions = () => {
        if (noTokensAvailable) {
            return <option value='' key='none'>{t`No tokens available`}</option>
        }

        return sendableTokens.map((token) => {
            return <option value={token.uid} key={token.uid}>{token.symbol}</option>;
        })
    }

    const changeSelect = (e) => {
        const selected = sendableTokens.find((token) => token.uid === e.target.value);
        setSelectedToken(selected);
        setSelectedTokenBalance(getTokenBalanceById(selected.uid));
    }

    /**
     * Validates form fields and return true if all are valid
     * @returns {Promise<boolean>}
     */
    const validateForm = async () => {
        // An error message is already being exhibited for manual utxo selection.
        if (utxoError) {
            return false;
        }

        // Validating optional change address
        const addressObj = new Address(changeAddress);
        if (changeAddress.length > 0) {
            if (!addressObj.isValid()) {
                setErrMessage(t`Invalid change address.`)
                return false;
            }

            if (!await wallet.isAddressMine(changeAddress)) {
                setErrMessage(t`Change address does not belong to this wallet`);
                return false;
            }
        }

        // Validating mandatory amount
        if (amount === 0 || !amount) {
            setErrMessage(t`Must send a positive amount of tokens`);
            return false;
        }

        // Validating available balance
        const selectedAmount = decimalToInteger(amount);
        const availableAmount = selectedTokenBalance.data.available;
        if (selectedAmount > availableAmount) {
            setErrMessage(t`Insufficient balance`);
            return false;
        }

        // If utxos are selected, validating their balances are enough
        if (showUtxoSelection) {
            const validUtxos = utxos.filter(u => u.amount);
            const totalAmount = validUtxos.reduce((acc, u) => acc + u.amount, 0);
            if (selectedAmount > totalAmount) {
                setErrMessage(t`Insufficient balance on selected inputs`);
                return false;
            }
        }

        return true;
    }

    const handleSend = async (e) => {
        e.preventDefault();

        // Don't submit an invalid form
        if (!await validateForm()) {
            return;
        }

        const selectedUtxos = showUtxoSelection && utxos.map(u => {
            return translateTxToProposalUtxo(u.tx_id, u.index, wallet);
        });

        setErrMessage('');
        sendClickHandler({
            selectedToken,
            changeAddress: changeAddress,
            amount: decimalToInteger(amount),
            utxos: selectedUtxos,
        });
        onClose(`#${modalDomId}`);
    }

    const handleUtxoChange = ({ utxos }) => {
        const utxoMap = {};
        let duplicateErrMsg = '';

        // Checking for duplicate inputs
        for (const listIndex in utxos) {
            const utxo = utxos[listIndex];

            // Empty entry, ignore it
            if (!utxo?.tx_id || !utxo.index) {
                continue;
            }

            // Add this entry to the map
            if (!utxoMap[utxo.tx_id]) {
                utxoMap[utxo.tx_id] = utxo;
                continue;
            }

            // Validate if this entry is a duplicate
            const mapItem = utxoMap[utxo.tx_id];
            if (mapItem.index === utxo.index) {
                duplicateErrMsg = `${t`Duplicate utxo on line`} ${+listIndex + 1}`
            }
        }

        // No errors were found
        setUtxoError(duplicateErrMsg.length > 0);
        setErrMessage(duplicateErrMsg);
        setUtxos(utxos);
    }

    const handleUtxoError = (errorMessage) => {
        setUtxoError(errorMessage.length > 0);
        setErrMessage(errorMessage);
    }

    useEffect(() => {
        manageDomLifecycle(`#${modalDomId}`);
    }, [])

    return <div><div className="modal fade"
             id={modalDomId}
             tabIndex="-1"
             role="dialog"
             aria-labelledby={modalDomId}
             aria-hidden="true">
            <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{t`Send Tokens`}</h5>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true"><i className="fa fa-close pointer ml-1"></i></span>
                        </button>
                    </div>
                    <div className="modal-body modal-body-atomic-send">
                        <form className="px-4">
                            <div className="row">
                                <label htmlFor="token" className="col-3 my-auto">{t`Token`}: </label>
                                <select className="col-5 form-control"
                                        name="token"
                                        value={selectedToken.uid}
                                        disabled={!sendableTokens.length}
                                        onChange={changeSelect}>
                                    {renderTokenOptions()}
                                </select>
                                { !noTokensAvailable &&
                                <span className="ml-1 my-auto">
                                    (
                                    {selectedTokenBalance.status === TOKEN_DOWNLOAD_STATUS.READY
                                        ? selectedTokenBalance.data.available
                                        : <Loading className='mt-auto' height={24} width={24} delay={10} />}
                                    &nbsp;{t`available`})
                                </span>
                                }
                            </div>
                            <div className="row mt-2">
                                <label htmlFor="amount" className="col-3 my-auto">{t`Amount`}: </label>
                                <InputNumber key="value"
                                             name="amount"
                                             ref={amountRef}
                                             defaultValue={hathorLib.numberUtils.prettyValue(amount)}
                                             placeholder={hathorLib.numberUtils.prettyValue(0)}
                                             onValueChange={value => setAmount(value)}
                                             className="form-control output-value col-3"/>
                            </div>
                            <div className="row mt-2">
                                <label htmlFor="change-address" className="col-3 my-auto">{t`Address`}: </label>
                                <input type="text"
                                       placeholder={`${t`Change Address`} ${t`(Optional)`}`}
                                       name="change-address"
                                       value={changeAddress}
                                       onChange={e => setChangeAddress(e.target.value)}
                                       className="form-control output-address col-6"
                                />
                            </div>
                            <div className={`form-check checkbox-wrapper mt-4 mb-2`}>
                                <input className={`form-check-input ${utxoError && 'is-invalid'}`}
                                       id="automaticUtxosCheck"
                                       type="checkbox"
                                       defaultChecked="true"
                                       onChange={() => setShowUtxoSelection((prev) => !prev)} />
                                <label className="form-check-label"
                                       htmlFor="automaticUtxosCheck">
                                    {t`Choose inputs automatically`}
                                </label>
                            </div>
                            {showUtxoSelection && <UtxoSelection
                                utxos={utxos}
                                wallet={wallet}
                                token={selectedToken}
                                utxosChanged={handleUtxoChange}
                                setErrMessage={handleUtxoError}
                            />}
                        </form>
                    </div>
                    <div className="modal-footer">
                        {errMessage && <div className="mt-3">
                            <p className="text-danger mt-3 white-space-pre-wrap">{errMessage}</p>
                        </div>}
                        <div className="d-flex flex-row">
                            <button type="button" className="btn btn-secondary mr-3" data-dismiss="modal">{t`Cancel`}</button>
                            <button onClick={handleSend} type="button" className="btn btn-hathor">{t`Send`}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}
