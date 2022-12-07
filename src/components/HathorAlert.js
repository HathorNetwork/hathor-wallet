/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';

/**
 * Component to show an alert on the bottom right corner of the screen
 *
 * @memberof Components
 */
const HathorAlert = forwardRef(({ text, onDismiss, type, extraClasses }, ref) => {
  const [show, setShow] = useState(false);
  const [timer, setTimer] = useState(null);

  const dismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);

  useImperativeHandle(ref, () => ({
    show: (duration) => {
      setShow(true);

      if (duration >= 0) {
        setTimer(setTimeout(() => setShow(false), duration));
      }
    },
    dismiss,
  }));

  useEffect(() => {
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [timer]);

  return (
    <div className={`hathor-alert alert alert-${type} alert-dismissible fade ${ extraClasses || 'col-10 col-sm-3' } ${ show ? 'show' : ''}`} role="alert">
      {text}
      <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={dismiss}>
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
});

export default HathorAlert;
