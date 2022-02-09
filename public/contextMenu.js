/*
MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
Original from: https://github.com/sindresorhus/electron-context-menu/releases/tag/v3.1.1

    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documen
    tation files (the "Software"), to deal in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
    persons to whom the Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
    Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
    WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
    OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const electron = require('electron');

const webContents = win => win.webContents || (win.id && win);

/**
 * Removes menuItems that are not being used
 * @param menuTemplate
 * @returns {*}
 */
const removeUnusedMenuItems = menuTemplate => {
  return menuTemplate
    .filter(menuItem => {
      // First rules to remove an item
      return menuItem.visible !== false && menuItem.visible !== '';
    })
};

/**
 * Creates a function that handles context menu events and adds it to the window listener.
 * Returns another function to dispose of this listener.
 * @param {Electron.BrowserWindow} win
 * @param {ContextMenuOptions} options
 * @returns {(function(): void)|*} A function to dispose of the context-menu listener
 */
const create = (win, options) => {
  /**
   * A function to handle Electron.BrowserWindow "context-menu" events
   * Builds all the relevant menuItems for the current context.
   * @param {Event} event
   * @param {Record<string,unknown>} props
   */
  const handleContextMenu = (event, props) => {
    /**
     * Flags that inform if the field can be copied from and pasted to ( e.g.: Can't copy from password )
     */
    const {editFlags} = props;
    const hasText = props.selectionText.trim().length > 0;

    /**
     * Helps identify if the user can copy/cut from a field. No text means false.
     * @param {'Cut'|'Copy'} type
     * @returns {*|boolean} If truthy, can Copy/Cut
     */
    const can = type => editFlags[`can${type}`] && hasText;

    // Map of functions that create the default menuItems
    const defaultActions = {
      separator: () => ({type: 'separator'}),
      cut: () => ({
        id: 'cut',
        label: 'Cu&t', // The "&" represents that the next letter will be the keyboard shortcut for this item
        enabled: can('Cut'),
        visible: props.isEditable,
        click() {
          const target = webContents(win);

          if (target) {
            target.cut();
          } else {
            electron.clipboard.writeText(props.selectionText);
          }
        }
      }),
      copy: () => ({
        id: 'copy',
        label: '&Copy',
        enabled: can('Copy'),
        visible: props.isEditable || hasText,
        click() {
          const target = webContents(win);

          if (target) {
            target.copy();
          } else {
            electron.clipboard.writeText(props.selectionText);
          }
        }
      }),
      paste: () => ({
        id: 'paste',
        label: '&Paste',
        enabled: editFlags.canPaste,
        visible: props.isEditable,
        click() {
          const target = webContents(win);
          target.paste();
        }
      }),
      inspect: () => ({
        id: 'inspect',
        label: 'I&nspect Element',
        click() {
          win.inspectElement(props.x, props.y);

          if (webContents(win).isDevToolsOpened()) {
            webContents(win).devToolsWebContents.focus();
          }
        }
      }),
    };

    const shouldShowInspectElement = typeof options.showInspectElement === 'boolean' ? options.showInspectElement : false;

    // Build a default menu template
    let menuTemplate = [
      defaultActions.cut(),
      defaultActions.copy(),
      defaultActions.paste(),
    ];

    // If on debug mode, show the "Inspect" button too
    if (shouldShowInspectElement) {
      menuTemplate.push(defaultActions.separator())
      menuTemplate.push(defaultActions.inspect())
    }

    // Remove items that are not relevant for this context
    menuTemplate = removeUnusedMenuItems(menuTemplate);

    // Only render if there are elements remaining
    if (menuTemplate.length > 0) {
      const menu = electron.Menu.buildFromTemplate(menuTemplate);
      menu.popup(win);
    }
  };

  // Adds the above function to the context-menu listener for handling mouse right-clicks
  webContents(win).on('context-menu', handleContextMenu);

  // Returns a function that allows for disposal of the listener
  return () => {
    // No need to dispose if the window that contained the listener was already destroyed
    if (win.isDestroyed()) {
      return;
    }

    webContents(win).removeListener('context-menu', handleContextMenu);
  };
};

/**
 * @typedef ContextMenuOptions
 * @property {boolean} showInspectElement If true, the "Inspect" option will be shown on the Context Menu
 */

/**
 * This library creates a function that handles "context menu" events for an Electron.BrowserWindow.
 *
 * @param {ContextMenuOptions} options
 * @returns {function} A function with no parameters that allows for disposal of every resource allocated for the ContextMenu.
 */
module.exports = (options = {}) => {
  // Process validation
  if (process.type === 'renderer') {
    throw new Error('Cannot use electron-context-menu in the renderer process!');
  }

  // Handles the state of all disposables, variables and event listeners
  let isDisposed = false;
  const disposables = [];

  /**
   * Initializes the event listeners and the ContextMenu itself
   * @param {Electron.BrowserWindow} win
   * @returns {void}
    */
  const init = win => {
    // Avoid re-instantiating when the listeners were already disposed
    if (isDisposed) {
      return;
    }

    // The create function returns an element that should persist on memory but be disposed at window close
    const disposeMenu = create(win, options);
    disposables.push(disposeMenu);

    // Creates a new function to remove the contextMenu from the array of disposables when executed
    const removeDisposable = () => {
      const index = disposables.indexOf(disposeMenu);
      if (index !== -1) {
        disposables.splice(index, 1);
      }
    };

    // Makes sure this function will be called at window close
    if (typeof win.once !== 'undefined') { // Support for BrowserView
      win.once('closed', removeDisposable);
    }

    disposables.push(() => {
      win.off('closed', removeDisposable);
    });
  };

  /**
   * Disposes of all listeners and avoid future initialization of this object
   * @returns {void}
   */
  const dispose = () => {
    // Disposes of each event listener on the disposables array
    for (const dispose of disposables) {
      dispose();
    }

    // Clears the array and signals the disposal
    disposables.length = 0;
    isDisposed = true;
  };

  // Initializes the listeners on all available windows
  for (const win of electron.BrowserWindow.getAllWindows()) {
    init(win);
  }

  // Function to be called on window creation event
  const onWindowCreated = (event, win) => {
    init(win);
  };

  // Associating function to event listener
  electron.app.on('browser-window-created', onWindowCreated);
  disposables.push(() => {
    electron.app.removeListener('browser-window-created', onWindowCreated);
  });

  // Returns to the caller a function that allows for disposal of every resource allocated for the ContextMenu.
  return dispose;
};
