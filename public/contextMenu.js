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

const decorateMenuItem = menuItem => {
  return (options = {}) => {
    if (options.transform && !options.click) {
      menuItem.transform = options.transform;
    }

    return menuItem;
  };
};

const removeUnusedMenuItems = menuTemplate => {
  let notDeletedPreviousElement;

  return menuTemplate
    .filter(menuItem => menuItem !== undefined && menuItem !== false && menuItem.visible !== false && menuItem.visible !== '')
    .filter((menuItem, index, array) => {
      const toDelete = menuItem.type === 'separator' && (!notDeletedPreviousElement || index === array.length - 1 || array[index + 1].type === 'separator');
      notDeletedPreviousElement = toDelete ? notDeletedPreviousElement : menuItem;
      return !toDelete;
    });
};

const create = (win, options) => {
  const handleContextMenu = (event, props) => {
    if (typeof options.shouldShowMenu === 'function' && options.shouldShowMenu(event, props) === false) {
      return;
    }

    const {editFlags} = props;
    const hasText = props.selectionText.trim().length > 0;
    const can = type => editFlags[`can${type}`] && hasText;

    const defaultActions = {
      separator: () => ({type: 'separator'}),
      cut: decorateMenuItem({
        id: 'cut',
        label: 'Cu&t',
        enabled: can('Cut'),
        visible: props.isEditable,
        click(menuItem) {
          const target = webContents(win);

          if (!menuItem.transform && target) {
            target.cut();
          } else {
            props.selectionText = menuItem.transform ? menuItem.transform(props.selectionText) : props.selectionText;
            electron.clipboard.writeText(props.selectionText);
          }
        }
      }),
      copy: decorateMenuItem({
        id: 'copy',
        label: '&Copy',
        enabled: can('Copy'),
        visible: props.isEditable || hasText,
        click(menuItem) {
          const target = webContents(win);

          if (!menuItem.transform && target) {
            target.copy();
          } else {
            props.selectionText = menuItem.transform ? menuItem.transform(props.selectionText) : props.selectionText;
            electron.clipboard.writeText(props.selectionText);
          }
        }
      }),
      paste: decorateMenuItem({
        id: 'paste',
        label: '&Paste',
        enabled: editFlags.canPaste,
        visible: props.isEditable,
        click(menuItem) {
          const target = webContents(win);

          if (menuItem.transform) {
            let clipboardContent = electron.clipboard.readText(props.selectionText);
            clipboardContent = menuItem.transform ? menuItem.transform(clipboardContent) : clipboardContent;
            target.insertText(clipboardContent);
          } else {
            target.paste();
          }
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

    let dictionarySuggestions = [];

    let menuTemplate = [
      defaultActions.cut(),
      defaultActions.copy(),
      defaultActions.paste(),
      defaultActions.separator(),
      shouldShowInspectElement && defaultActions.inspect(),
      defaultActions.separator()
    ];

    if (options.menu) {
      menuTemplate = options.menu(defaultActions, props, win, dictionarySuggestions, event);
    }

    if (options.prepend) {
      const result = options.prepend(defaultActions, props, win, event);

      if (Array.isArray(result)) {
        menuTemplate.unshift(...result);
      }
    }

    if (options.append) {
      const result = options.append(defaultActions, props, win, event);

      if (Array.isArray(result)) {
        menuTemplate.push(...result);
      }
    }

    menuTemplate = removeUnusedMenuItems(menuTemplate);

    for (const menuItem of menuTemplate) {
      // Apply custom labels for default menu items
      if (options.labels && options.labels[menuItem.id]) {
        menuItem.label = options.labels[menuItem.id];
      }
    }

    if (menuTemplate.length > 0) {
      const menu = electron.Menu.buildFromTemplate(menuTemplate);
      menu.popup(win);
    }
  };

  webContents(win).on('context-menu', handleContextMenu);

  return () => {
    if (win.isDestroyed()) {
      return;
    }

    webContents(win).removeListener('context-menu', handleContextMenu);
  };
};

module.exports = (options = {}) => {
  if (process.type === 'renderer') {
    throw new Error('Cannot use electron-context-menu in the renderer process!');
  }

  let isDisposed = false;
  const disposables = [];

  const init = win => {
    if (isDisposed) {
      return;
    }

    const disposeMenu = create(win, options);

    disposables.push(disposeMenu);
    const removeDisposable = () => {
      const index = disposables.indexOf(disposeMenu);
      if (index !== -1) {
        disposables.splice(index, 1);
      }
    };

    if (typeof win.once !== 'undefined') { // Support for BrowserView
      win.once('closed', removeDisposable);
    }

    disposables.push(() => {
      win.off('closed', removeDisposable);
    });
  };

  const dispose = () => {
    for (const dispose of disposables) {
      dispose();
    }

    disposables.length = 0;
    isDisposed = true;
  };

  if (options.window) {
    const win = options.window;

    // When window is a webview that has not yet finished loading webContents is not available
    if (webContents(win) === undefined) {
      const onDomReady = () => {
        init(win);
      };

      const listenerFunction = win.addEventListener || win.addListener;
      listenerFunction('dom-ready', onDomReady, {once: true});

      disposables.push(() => {
        win.removeEventListener('dom-ready', onDomReady, {once: true});
      });

      return dispose;
    }

    init(win);

    return dispose;
  }

  for (const win of electron.BrowserWindow.getAllWindows()) {
    init(win);
  }

  const onWindowCreated = (event, win) => {
    init(win);
  };

  electron.app.on('browser-window-created', onWindowCreated);
  disposables.push(() => {
    electron.app.removeListener('browser-window-created', onWindowCreated);
  });

  return dispose;
};
