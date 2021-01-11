import { c as css, S as SpectrumElement, h as html, i as ifDefined, _ as __decorate, p as property } from './app-2547d520.js';

function getBoundingClientRect(element) {
  var rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    x: rect.left,
    y: rect.top
  };
}

/*:: import type { Window } from '../types'; */

/*:: declare function getWindow(node: Node | Window): Window; */
function getWindow(node) {
  if (node.toString() !== '[object Window]') {
    var ownerDocument = node.ownerDocument;
    return ownerDocument ? ownerDocument.defaultView || window : window;
  }

  return node;
}

function getWindowScroll(node) {
  var win = getWindow(node);
  var scrollLeft = win.pageXOffset;
  var scrollTop = win.pageYOffset;
  return {
    scrollLeft: scrollLeft,
    scrollTop: scrollTop
  };
}

/*:: declare function isElement(node: mixed): boolean %checks(node instanceof
  Element); */

function isElement(node) {
  var OwnElement = getWindow(node).Element;
  return node instanceof OwnElement || node instanceof Element;
}
/*:: declare function isHTMLElement(node: mixed): boolean %checks(node instanceof
  HTMLElement); */


function isHTMLElement(node) {
  var OwnElement = getWindow(node).HTMLElement;
  return node instanceof OwnElement || node instanceof HTMLElement;
}
/*:: declare function isShadowRoot(node: mixed): boolean %checks(node instanceof
  ShadowRoot); */


function isShadowRoot(node) {
  var OwnElement = getWindow(node).ShadowRoot;
  return node instanceof OwnElement || node instanceof ShadowRoot;
}

function getHTMLElementScroll(element) {
  return {
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop
  };
}

function getNodeScroll(node) {
  if (node === getWindow(node) || !isHTMLElement(node)) {
    return getWindowScroll(node);
  } else {
    return getHTMLElementScroll(node);
  }
}

function getNodeName(element) {
  return element ? (element.nodeName || '').toLowerCase() : null;
}

function getDocumentElement(element) {
  // $FlowFixMe[incompatible-return]: assume body is always available
  return ((isElement(element) ? element.ownerDocument : // $FlowFixMe[prop-missing]
  element.document) || window.document).documentElement;
}

function getWindowScrollBarX(element) {
  // If <html> has a CSS width greater than the viewport, then this will be
  // incorrect for RTL.
  // Popper 1 is broken in this case and never had a bug report so let's assume
  // it's not an issue. I don't think anyone ever specifies width on <html>
  // anyway.
  // Browsers where the left scrollbar doesn't cause an issue report `0` for
  // this (e.g. Edge 2019, IE11, Safari)
  return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
}

function getComputedStyle(element) {
  return getWindow(element).getComputedStyle(element);
}

function isScrollParent(element) {
  // Firefox wants us to check `-x` and `-y` variations as well
  var _getComputedStyle = getComputedStyle(element),
      overflow = _getComputedStyle.overflow,
      overflowX = _getComputedStyle.overflowX,
      overflowY = _getComputedStyle.overflowY;

  return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
}

// Composite means it takes into account transforms as well as layout.

function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
  if (isFixed === void 0) {
    isFixed = false;
  }

  var documentElement = getDocumentElement(offsetParent);
  var rect = getBoundingClientRect(elementOrVirtualElement);
  var isOffsetParentAnElement = isHTMLElement(offsetParent);
  var scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  var offsets = {
    x: 0,
    y: 0
  };

  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== 'body' || // https://github.com/popperjs/popper-core/issues/1078
    isScrollParent(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }

    if (isHTMLElement(offsetParent)) {
      offsets = getBoundingClientRect(offsetParent);
      offsets.x += offsetParent.clientLeft;
      offsets.y += offsetParent.clientTop;
    } else if (documentElement) {
      offsets.x = getWindowScrollBarX(documentElement);
    }
  }

  return {
    x: rect.left + scroll.scrollLeft - offsets.x,
    y: rect.top + scroll.scrollTop - offsets.y,
    width: rect.width,
    height: rect.height
  };
}

// Returns the layout rect of an element relative to its offsetParent. Layout
// means it doesn't take into account transforms.
function getLayoutRect(element) {
  return {
    x: element.offsetLeft,
    y: element.offsetTop,
    width: element.offsetWidth,
    height: element.offsetHeight
  };
}

function getParentNode(element) {
  if (getNodeName(element) === 'html') {
    return element;
  }

  return (// this is a quicker (but less type safe) way to save quite some bytes from the bundle
    // $FlowFixMe[incompatible-return]
    // $FlowFixMe[prop-missing]
    element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
    element.parentNode || // DOM Element detected
    // $FlowFixMe[incompatible-return]: need a better way to handle this...
    element.host || // ShadowRoot detected
    // $FlowFixMe[incompatible-call]: HTMLElement is a Node
    getDocumentElement(element) // fallback

  );
}

function getScrollParent(node) {
  if (['html', 'body', '#document'].indexOf(getNodeName(node)) >= 0) {
    // $FlowFixMe[incompatible-return]: assume body is always available
    return node.ownerDocument.body;
  }

  if (isHTMLElement(node) && isScrollParent(node)) {
    return node;
  }

  return getScrollParent(getParentNode(node));
}

/*
given a DOM element, return the list of all scroll parents, up the list of ancesors
until we get to the top window object. This list is what we attach scroll listeners
to, because if any of these parent elements scroll, we'll need to re-calculate the
reference element's position.
*/

function listScrollParents(element, list) {
  if (list === void 0) {
    list = [];
  }

  var scrollParent = getScrollParent(element);
  var isBody = getNodeName(scrollParent) === 'body';
  var win = getWindow(scrollParent);
  var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
  var updatedList = list.concat(target);
  return isBody ? updatedList : // $FlowFixMe[incompatible-call]: isBody tells us target will be an HTMLElement here
  updatedList.concat(listScrollParents(getParentNode(target)));
}

function isTableElement(element) {
  return ['table', 'td', 'th'].indexOf(getNodeName(element)) >= 0;
}

function getTrueOffsetParent(element) {
  if (!isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
  getComputedStyle(element).position === 'fixed') {
    return null;
  }

  var offsetParent = element.offsetParent;

  if (offsetParent) {
    var html = getDocumentElement(offsetParent);

    if (getNodeName(offsetParent) === 'body' && getComputedStyle(offsetParent).position === 'static' && getComputedStyle(html).position !== 'static') {
      return html;
    }
  }

  return offsetParent;
} // `.offsetParent` reports `null` for fixed elements, while absolute elements
// return the containing block


function getContainingBlock(element) {
  var currentNode = getParentNode(element);

  while (isHTMLElement(currentNode) && ['html', 'body'].indexOf(getNodeName(currentNode)) < 0) {
    var css = getComputedStyle(currentNode); // This is non-exhaustive but covers the most common CSS properties that
    // create a containing block.

    if (css.transform !== 'none' || css.perspective !== 'none' || css.willChange && css.willChange !== 'auto') {
      return currentNode;
    } else {
      currentNode = currentNode.parentNode;
    }
  }

  return null;
} // Gets the closest ancestor positioned element. Handles some edge cases,
// such as table ancestors and cross browser bugs.


function getOffsetParent(element) {
  var window = getWindow(element);
  var offsetParent = getTrueOffsetParent(element);

  while (offsetParent && isTableElement(offsetParent) && getComputedStyle(offsetParent).position === 'static') {
    offsetParent = getTrueOffsetParent(offsetParent);
  }

  if (offsetParent && getNodeName(offsetParent) === 'body' && getComputedStyle(offsetParent).position === 'static') {
    return window;
  }

  return offsetParent || getContainingBlock(element) || window;
}

var top = 'top';
var bottom = 'bottom';
var right = 'right';
var left = 'left';
var auto = 'auto';
var basePlacements = [top, bottom, right, left];
var start = 'start';
var end = 'end';
var clippingParents = 'clippingParents';
var viewport = 'viewport';
var popper = 'popper';
var reference = 'reference';
var variationPlacements = /*#__PURE__*/basePlacements.reduce(function (acc, placement) {
  return acc.concat([placement + "-" + start, placement + "-" + end]);
}, []);
var placements = /*#__PURE__*/[].concat(basePlacements, [auto]).reduce(function (acc, placement) {
  return acc.concat([placement, placement + "-" + start, placement + "-" + end]);
}, []); // modifiers that need to read the DOM

var beforeRead = 'beforeRead';
var read = 'read';
var afterRead = 'afterRead'; // pure-logic modifiers

var beforeMain = 'beforeMain';
var main = 'main';
var afterMain = 'afterMain'; // modifier with the purpose to write to the DOM (or write into a framework state)

var beforeWrite = 'beforeWrite';
var write = 'write';
var afterWrite = 'afterWrite';
var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

function order(modifiers) {
  var map = new Map();
  var visited = new Set();
  var result = [];
  modifiers.forEach(function (modifier) {
    map.set(modifier.name, modifier);
  }); // On visiting object, check for its dependencies and visit them recursively

  function sort(modifier) {
    visited.add(modifier.name);
    var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
    requires.forEach(function (dep) {
      if (!visited.has(dep)) {
        var depModifier = map.get(dep);

        if (depModifier) {
          sort(depModifier);
        }
      }
    });
    result.push(modifier);
  }

  modifiers.forEach(function (modifier) {
    if (!visited.has(modifier.name)) {
      // check for visited object
      sort(modifier);
    }
  });
  return result;
}

function orderModifiers(modifiers) {
  // order based on dependencies
  var orderedModifiers = order(modifiers); // order based on phase

  return modifierPhases.reduce(function (acc, phase) {
    return acc.concat(orderedModifiers.filter(function (modifier) {
      return modifier.phase === phase;
    }));
  }, []);
}

function debounce(fn) {
  var pending;
  return function () {
    if (!pending) {
      pending = new Promise(function (resolve) {
        Promise.resolve().then(function () {
          pending = undefined;
          resolve(fn());
        });
      });
    }

    return pending;
  };
}

function format(str) {
  for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return [].concat(args).reduce(function (p, c) {
    return p.replace(/%s/, c);
  }, str);
}

var INVALID_MODIFIER_ERROR = 'Popper: modifier "%s" provided an invalid %s property, expected %s but got %s';
var MISSING_DEPENDENCY_ERROR = 'Popper: modifier "%s" requires "%s", but "%s" modifier is not available';
var VALID_PROPERTIES = ['name', 'enabled', 'phase', 'fn', 'effect', 'requires', 'options'];
function validateModifiers(modifiers) {
  modifiers.forEach(function (modifier) {
    Object.keys(modifier).forEach(function (key) {
      switch (key) {
        case 'name':
          if (typeof modifier.name !== 'string') {
            console.error(format(INVALID_MODIFIER_ERROR, String(modifier.name), '"name"', '"string"', "\"" + String(modifier.name) + "\""));
          }

          break;

        case 'enabled':
          if (typeof modifier.enabled !== 'boolean') {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"enabled"', '"boolean"', "\"" + String(modifier.enabled) + "\""));
          }

        case 'phase':
          if (modifierPhases.indexOf(modifier.phase) < 0) {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"phase"', "either " + modifierPhases.join(', '), "\"" + String(modifier.phase) + "\""));
          }

          break;

        case 'fn':
          if (typeof modifier.fn !== 'function') {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"fn"', '"function"', "\"" + String(modifier.fn) + "\""));
          }

          break;

        case 'effect':
          if (typeof modifier.effect !== 'function') {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"effect"', '"function"', "\"" + String(modifier.fn) + "\""));
          }

          break;

        case 'requires':
          if (!Array.isArray(modifier.requires)) {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requires"', '"array"', "\"" + String(modifier.requires) + "\""));
          }

          break;

        case 'requiresIfExists':
          if (!Array.isArray(modifier.requiresIfExists)) {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requiresIfExists"', '"array"', "\"" + String(modifier.requiresIfExists) + "\""));
          }

          break;

        case 'options':
        case 'data':
          break;

        default:
          console.error("PopperJS: an invalid property has been provided to the \"" + modifier.name + "\" modifier, valid properties are " + VALID_PROPERTIES.map(function (s) {
            return "\"" + s + "\"";
          }).join(', ') + "; but \"" + key + "\" was provided.");
      }

      modifier.requires && modifier.requires.forEach(function (requirement) {
        if (modifiers.find(function (mod) {
          return mod.name === requirement;
        }) == null) {
          console.error(format(MISSING_DEPENDENCY_ERROR, String(modifier.name), requirement, requirement));
        }
      });
    });
  });
}

function uniqueBy(arr, fn) {
  var identifiers = new Set();
  return arr.filter(function (item) {
    var identifier = fn(item);

    if (!identifiers.has(identifier)) {
      identifiers.add(identifier);
      return true;
    }
  });
}

function getBasePlacement(placement) {
  return placement.split('-')[0];
}

function mergeByName(modifiers) {
  var merged = modifiers.reduce(function (merged, current) {
    var existing = merged[current.name];
    merged[current.name] = existing ? Object.assign(Object.assign(Object.assign({}, existing), current), {}, {
      options: Object.assign(Object.assign({}, existing.options), current.options),
      data: Object.assign(Object.assign({}, existing.data), current.data)
    }) : current;
    return merged;
  }, {}); // IE11 does not support Object.values

  return Object.keys(merged).map(function (key) {
    return merged[key];
  });
}

function getViewportRect(element) {
  var win = getWindow(element);
  var html = getDocumentElement(element);
  var visualViewport = win.visualViewport;
  var width = html.clientWidth;
  var height = html.clientHeight;
  var x = 0;
  var y = 0; // NB: This isn't supported on iOS <= 12. If the keyboard is open, the popper
  // can be obscured underneath it.
  // Also, `html.clientHeight` adds the bottom bar height in Safari iOS, even
  // if it isn't open, so if this isn't available, the popper will be detected
  // to overflow the bottom of the screen too early.

  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height; // Uses Layout Viewport (like Chrome; Safari does not currently)
    // In Chrome, it returns a value very close to 0 (+/-) but contains rounding
    // errors due to floating point numbers, so we need to check precision.
    // Safari returns a number <= 0, usually < -1 when pinch-zoomed
    // Feature detection fails in mobile emulation mode in Chrome.
    // Math.abs(win.innerWidth / visualViewport.scale - visualViewport.width) <
    // 0.001
    // Fallback here: "Not Safari" userAgent

    if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      x = visualViewport.offsetLeft;
      y = visualViewport.offsetTop;
    }
  }

  return {
    width: width,
    height: height,
    x: x + getWindowScrollBarX(element),
    y: y
  };
}

// of the `<html>` and `<body>` rect bounds if horizontally scrollable

function getDocumentRect(element) {
  var html = getDocumentElement(element);
  var winScroll = getWindowScroll(element);
  var body = element.ownerDocument.body;
  var width = Math.max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
  var height = Math.max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
  var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
  var y = -winScroll.scrollTop;

  if (getComputedStyle(body || html).direction === 'rtl') {
    x += Math.max(html.clientWidth, body ? body.clientWidth : 0) - width;
  }

  return {
    width: width,
    height: height,
    x: x,
    y: y
  };
}

function contains(parent, child) {
  var rootNode = child.getRootNode && child.getRootNode(); // First, attempt with faster native method

  if (parent.contains(child)) {
    return true;
  } // then fallback to custom implementation with Shadow DOM support
  else if (rootNode && isShadowRoot(rootNode)) {
      var next = child;

      do {
        if (next && parent.isSameNode(next)) {
          return true;
        } // $FlowFixMe[prop-missing]: need a better way to handle this...


        next = next.parentNode || next.host;
      } while (next);
    } // Give up, the result is false


  return false;
}

function rectToClientRect(rect) {
  return Object.assign(Object.assign({}, rect), {}, {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  });
}

function getInnerBoundingClientRect(element) {
  var rect = getBoundingClientRect(element);
  rect.top = rect.top + element.clientTop;
  rect.left = rect.left + element.clientLeft;
  rect.bottom = rect.top + element.clientHeight;
  rect.right = rect.left + element.clientWidth;
  rect.width = element.clientWidth;
  rect.height = element.clientHeight;
  rect.x = rect.left;
  rect.y = rect.top;
  return rect;
}

function getClientRectFromMixedType(element, clippingParent) {
  return clippingParent === viewport ? rectToClientRect(getViewportRect(element)) : isHTMLElement(clippingParent) ? getInnerBoundingClientRect(clippingParent) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
} // A "clipping parent" is an overflowable container with the characteristic of
// clipping (or hiding) overflowing elements with a position different from
// `initial`


function getClippingParents(element) {
  var clippingParents = listScrollParents(getParentNode(element));
  var canEscapeClipping = ['absolute', 'fixed'].indexOf(getComputedStyle(element).position) >= 0;
  var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;

  if (!isElement(clipperElement)) {
    return [];
  } // $FlowFixMe[incompatible-return]: https://github.com/facebook/flow/issues/1414


  return clippingParents.filter(function (clippingParent) {
    return isElement(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== 'body';
  });
} // Gets the maximum area that the element is visible in due to any number of
// clipping parents


function getClippingRect(element, boundary, rootBoundary) {
  var mainClippingParents = boundary === 'clippingParents' ? getClippingParents(element) : [].concat(boundary);
  var clippingParents = [].concat(mainClippingParents, [rootBoundary]);
  var firstClippingParent = clippingParents[0];
  var clippingRect = clippingParents.reduce(function (accRect, clippingParent) {
    var rect = getClientRectFromMixedType(element, clippingParent);
    accRect.top = Math.max(rect.top, accRect.top);
    accRect.right = Math.min(rect.right, accRect.right);
    accRect.bottom = Math.min(rect.bottom, accRect.bottom);
    accRect.left = Math.max(rect.left, accRect.left);
    return accRect;
  }, getClientRectFromMixedType(element, firstClippingParent));
  clippingRect.width = clippingRect.right - clippingRect.left;
  clippingRect.height = clippingRect.bottom - clippingRect.top;
  clippingRect.x = clippingRect.left;
  clippingRect.y = clippingRect.top;
  return clippingRect;
}

function getVariation(placement) {
  return placement.split('-')[1];
}

function getMainAxisFromPlacement(placement) {
  return ['top', 'bottom'].indexOf(placement) >= 0 ? 'x' : 'y';
}

function computeOffsets(_ref) {
  var reference = _ref.reference,
      element = _ref.element,
      placement = _ref.placement;
  var basePlacement = placement ? getBasePlacement(placement) : null;
  var variation = placement ? getVariation(placement) : null;
  var commonX = reference.x + reference.width / 2 - element.width / 2;
  var commonY = reference.y + reference.height / 2 - element.height / 2;
  var offsets;

  switch (basePlacement) {
    case top:
      offsets = {
        x: commonX,
        y: reference.y - element.height
      };
      break;

    case bottom:
      offsets = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;

    case right:
      offsets = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;

    case left:
      offsets = {
        x: reference.x - element.width,
        y: commonY
      };
      break;

    default:
      offsets = {
        x: reference.x,
        y: reference.y
      };
  }

  var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;

  if (mainAxis != null) {
    var len = mainAxis === 'y' ? 'height' : 'width';

    switch (variation) {
      case start:
        offsets[mainAxis] = offsets[mainAxis] - (reference[len] / 2 - element[len] / 2);
        break;

      case end:
        offsets[mainAxis] = offsets[mainAxis] + (reference[len] / 2 - element[len] / 2);
        break;
    }
  }

  return offsets;
}

function getFreshSideObject() {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };
}

function mergePaddingObject(paddingObject) {
  return Object.assign(Object.assign({}, getFreshSideObject()), paddingObject);
}

function expandToHashMap(value, keys) {
  return keys.reduce(function (hashMap, key) {
    hashMap[key] = value;
    return hashMap;
  }, {});
}

function detectOverflow(state, options) {
  if (options === void 0) {
    options = {};
  }

  var _options = options,
      _options$placement = _options.placement,
      placement = _options$placement === void 0 ? state.placement : _options$placement,
      _options$boundary = _options.boundary,
      boundary = _options$boundary === void 0 ? clippingParents : _options$boundary,
      _options$rootBoundary = _options.rootBoundary,
      rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary,
      _options$elementConte = _options.elementContext,
      elementContext = _options$elementConte === void 0 ? popper : _options$elementConte,
      _options$altBoundary = _options.altBoundary,
      altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary,
      _options$padding = _options.padding,
      padding = _options$padding === void 0 ? 0 : _options$padding;
  var paddingObject = mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
  var altContext = elementContext === popper ? reference : popper;
  var referenceElement = state.elements.reference;
  var popperRect = state.rects.popper;
  var element = state.elements[altBoundary ? altContext : elementContext];
  var clippingClientRect = getClippingRect(isElement(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary);
  var referenceClientRect = getBoundingClientRect(referenceElement);
  var popperOffsets = computeOffsets({
    reference: referenceClientRect,
    element: popperRect,
    strategy: 'absolute',
    placement: placement
  });
  var popperClientRect = rectToClientRect(Object.assign(Object.assign({}, popperRect), popperOffsets));
  var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect; // positive = overflowing the clipping rect
  // 0 or negative = within the clipping rect

  var overflowOffsets = {
    top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
    bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
    left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
    right: elementClientRect.right - clippingClientRect.right + paddingObject.right
  };
  var offsetData = state.modifiersData.offset; // Offsets can be applied only to the popper element

  if (elementContext === popper && offsetData) {
    var offset = offsetData[placement];
    Object.keys(overflowOffsets).forEach(function (key) {
      var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
      var axis = [top, bottom].indexOf(key) >= 0 ? 'y' : 'x';
      overflowOffsets[key] += offset[axis] * multiply;
    });
  }

  return overflowOffsets;
}

var INVALID_ELEMENT_ERROR = 'Popper: Invalid reference or popper argument provided. They must be either a DOM element or virtual element.';
var INFINITE_LOOP_ERROR = 'Popper: An infinite loop in the modifiers cycle has been detected! The cycle has been interrupted to prevent a browser crash.';
var DEFAULT_OPTIONS = {
  placement: 'bottom',
  modifiers: [],
  strategy: 'absolute'
};

function areValidElements() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return !args.some(function (element) {
    return !(element && typeof element.getBoundingClientRect === 'function');
  });
}

function popperGenerator(generatorOptions) {
  if (generatorOptions === void 0) {
    generatorOptions = {};
  }

  var _generatorOptions = generatorOptions,
      _generatorOptions$def = _generatorOptions.defaultModifiers,
      defaultModifiers = _generatorOptions$def === void 0 ? [] : _generatorOptions$def,
      _generatorOptions$def2 = _generatorOptions.defaultOptions,
      defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
  return function createPopper(reference, popper, options) {
    if (options === void 0) {
      options = defaultOptions;
    }

    var state = {
      placement: 'bottom',
      orderedModifiers: [],
      options: Object.assign(Object.assign({}, DEFAULT_OPTIONS), defaultOptions),
      modifiersData: {},
      elements: {
        reference: reference,
        popper: popper
      },
      attributes: {},
      styles: {}
    };
    var effectCleanupFns = [];
    var isDestroyed = false;
    var instance = {
      state: state,
      setOptions: function setOptions(options) {
        cleanupModifierEffects();
        state.options = Object.assign(Object.assign(Object.assign({}, defaultOptions), state.options), options);
        state.scrollParents = {
          reference: isElement(reference) ? listScrollParents(reference) : reference.contextElement ? listScrollParents(reference.contextElement) : [],
          popper: listScrollParents(popper)
        }; // Orders the modifiers based on their dependencies and `phase`
        // properties

        var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers, state.options.modifiers))); // Strip out disabled modifiers

        state.orderedModifiers = orderedModifiers.filter(function (m) {
          return m.enabled;
        }); // Validate the provided modifiers so that the consumer will get warned
        // if one of the modifiers is invalid for any reason

        if (process.env.NODE_ENV !== "production") {
          var modifiers = uniqueBy([].concat(orderedModifiers, state.options.modifiers), function (_ref) {
            var name = _ref.name;
            return name;
          });
          validateModifiers(modifiers);

          if (getBasePlacement(state.options.placement) === auto) {
            var flipModifier = state.orderedModifiers.find(function (_ref2) {
              var name = _ref2.name;
              return name === 'flip';
            });

            if (!flipModifier) {
              console.error(['Popper: "auto" placements require the "flip" modifier be', 'present and enabled to work.'].join(' '));
            }
          }

          var _getComputedStyle = getComputedStyle(popper),
              marginTop = _getComputedStyle.marginTop,
              marginRight = _getComputedStyle.marginRight,
              marginBottom = _getComputedStyle.marginBottom,
              marginLeft = _getComputedStyle.marginLeft; // We no longer take into account `margins` on the popper, and it can
          // cause bugs with positioning, so we'll warn the consumer


          if ([marginTop, marginRight, marginBottom, marginLeft].some(function (margin) {
            return parseFloat(margin);
          })) {
            console.warn(['Popper: CSS "margin" styles cannot be used to apply padding', 'between the popper and its reference element or boundary.', 'To replicate margin, use the `offset` modifier, as well as', 'the `padding` option in the `preventOverflow` and `flip`', 'modifiers.'].join(' '));
          }
        }

        runModifierEffects();
        return instance.update();
      },
      // Sync update – it will always be executed, even if not necessary. This
      // is useful for low frequency updates where sync behavior simplifies the
      // logic.
      // For high frequency updates (e.g. `resize` and `scroll` events), always
      // prefer the async Popper#update method
      forceUpdate: function forceUpdate() {
        if (isDestroyed) {
          return;
        }

        var _state$elements = state.elements,
            reference = _state$elements.reference,
            popper = _state$elements.popper; // Don't proceed if `reference` or `popper` are not valid elements
        // anymore

        if (!areValidElements(reference, popper)) {
          if (process.env.NODE_ENV !== "production") {
            console.error(INVALID_ELEMENT_ERROR);
          }

          return;
        } // Store the reference and popper rects to be read by modifiers


        state.rects = {
          reference: getCompositeRect(reference, getOffsetParent(popper), state.options.strategy === 'fixed'),
          popper: getLayoutRect(popper)
        }; // Modifiers have the ability to reset the current update cycle. The
        // most common use case for this is the `flip` modifier changing the
        // placement, which then needs to re-run all the modifiers, because the
        // logic was previously ran for the previous placement and is therefore
        // stale/incorrect

        state.reset = false;
        state.placement = state.options.placement; // On each update cycle, the `modifiersData` property for each modifier
        // is filled with the initial data specified by the modifier. This means
        // it doesn't persist and is fresh on each update.
        // To ensure persistent data, use `${name}#persistent`

        state.orderedModifiers.forEach(function (modifier) {
          return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
        });
        var __debug_loops__ = 0;

        for (var index = 0; index < state.orderedModifiers.length; index++) {
          if (process.env.NODE_ENV !== "production") {
            __debug_loops__ += 1;

            if (__debug_loops__ > 100) {
              console.error(INFINITE_LOOP_ERROR);
              break;
            }
          }

          if (state.reset === true) {
            state.reset = false;
            index = -1;
            continue;
          }

          var _state$orderedModifie = state.orderedModifiers[index],
              fn = _state$orderedModifie.fn,
              _state$orderedModifie2 = _state$orderedModifie.options,
              _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2,
              name = _state$orderedModifie.name;

          if (typeof fn === 'function') {
            state = fn({
              state: state,
              options: _options,
              name: name,
              instance: instance
            }) || state;
          }
        }
      },
      // Async and optimistically optimized update – it will not be executed if
      // not necessary (debounced to run at most once-per-tick)
      update: debounce(function () {
        return new Promise(function (resolve) {
          instance.forceUpdate();
          resolve(state);
        });
      }),
      destroy: function destroy() {
        cleanupModifierEffects();
        isDestroyed = true;
      }
    };

    if (!areValidElements(reference, popper)) {
      if (process.env.NODE_ENV !== "production") {
        console.error(INVALID_ELEMENT_ERROR);
      }

      return instance;
    }

    instance.setOptions(options).then(function (state) {
      if (!isDestroyed && options.onFirstUpdate) {
        options.onFirstUpdate(state);
      }
    }); // Modifiers have the ability to execute arbitrary code before the first
    // update cycle runs. They will be executed in the same order as the update
    // cycle. This is useful when a modifier adds some persistent data that
    // other modifiers need to use, but the modifier is run after the dependent
    // one.

    function runModifierEffects() {
      state.orderedModifiers.forEach(function (_ref3) {
        var name = _ref3.name,
            _ref3$options = _ref3.options,
            options = _ref3$options === void 0 ? {} : _ref3$options,
            effect = _ref3.effect;

        if (typeof effect === 'function') {
          var cleanupFn = effect({
            state: state,
            name: name,
            instance: instance,
            options: options
          });

          var noopFn = function noopFn() {};

          effectCleanupFns.push(cleanupFn || noopFn);
        }
      });
    }

    function cleanupModifierEffects() {
      effectCleanupFns.forEach(function (fn) {
        return fn();
      });
      effectCleanupFns = [];
    }

    return instance;
  };
}

var passive = {
  passive: true
};

function effect(_ref) {
  var state = _ref.state,
      instance = _ref.instance,
      options = _ref.options;
  var _options$scroll = options.scroll,
      scroll = _options$scroll === void 0 ? true : _options$scroll,
      _options$resize = options.resize,
      resize = _options$resize === void 0 ? true : _options$resize;
  var window = getWindow(state.elements.popper);
  var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);

  if (scroll) {
    scrollParents.forEach(function (scrollParent) {
      scrollParent.addEventListener('scroll', instance.update, passive);
    });
  }

  if (resize) {
    window.addEventListener('resize', instance.update, passive);
  }

  return function () {
    if (scroll) {
      scrollParents.forEach(function (scrollParent) {
        scrollParent.removeEventListener('scroll', instance.update, passive);
      });
    }

    if (resize) {
      window.removeEventListener('resize', instance.update, passive);
    }
  };
} // eslint-disable-next-line import/no-unused-modules


var eventListeners = {
  name: 'eventListeners',
  enabled: true,
  phase: 'write',
  fn: function fn() {},
  effect: effect,
  data: {}
};

function popperOffsets(_ref) {
  var state = _ref.state,
      name = _ref.name;
  // Offsets are the actual position the popper needs to have to be
  // properly positioned near its reference element
  // This is the most basic placement, and will be adjusted by
  // the modifiers in the next step
  state.modifiersData[name] = computeOffsets({
    reference: state.rects.reference,
    element: state.rects.popper,
    strategy: 'absolute',
    placement: state.placement
  });
} // eslint-disable-next-line import/no-unused-modules


var popperOffsets$1 = {
  name: 'popperOffsets',
  enabled: true,
  phase: 'read',
  fn: popperOffsets,
  data: {}
};

var unsetSides = {
  top: 'auto',
  right: 'auto',
  bottom: 'auto',
  left: 'auto'
}; // Round the offsets to the nearest suitable subpixel based on the DPR.
// Zooming can change the DPR, but it seems to report a value that will
// cleanly divide the values into the appropriate subpixels.

function roundOffsetsByDPR(_ref) {
  var x = _ref.x,
      y = _ref.y;
  var win = window;
  var dpr = win.devicePixelRatio || 1;
  return {
    x: Math.round(x * dpr) / dpr || 0,
    y: Math.round(y * dpr) / dpr || 0
  };
}

function mapToStyles(_ref2) {
  var _Object$assign2;

  var popper = _ref2.popper,
      popperRect = _ref2.popperRect,
      placement = _ref2.placement,
      offsets = _ref2.offsets,
      position = _ref2.position,
      gpuAcceleration = _ref2.gpuAcceleration,
      adaptive = _ref2.adaptive,
      roundOffsets = _ref2.roundOffsets;

  var _ref3 = roundOffsets ? roundOffsetsByDPR(offsets) : offsets,
      _ref3$x = _ref3.x,
      x = _ref3$x === void 0 ? 0 : _ref3$x,
      _ref3$y = _ref3.y,
      y = _ref3$y === void 0 ? 0 : _ref3$y;

  var hasX = offsets.hasOwnProperty('x');
  var hasY = offsets.hasOwnProperty('y');
  var sideX = left;
  var sideY = top;
  var win = window;

  if (adaptive) {
    var offsetParent = getOffsetParent(popper);

    if (offsetParent === getWindow(popper)) {
      offsetParent = getDocumentElement(popper);
    } // $FlowFixMe[incompatible-cast]: force type refinement, we compare offsetParent with window above, but Flow doesn't detect it

    /*:: offsetParent = (offsetParent: Element); */


    if (placement === top) {
      sideY = bottom;
      y -= offsetParent.clientHeight - popperRect.height;
      y *= gpuAcceleration ? 1 : -1;
    }

    if (placement === left) {
      sideX = right;
      x -= offsetParent.clientWidth - popperRect.width;
      x *= gpuAcceleration ? 1 : -1;
    }
  }

  var commonStyles = Object.assign({
    position: position
  }, adaptive && unsetSides);

  if (gpuAcceleration) {
    var _Object$assign;

    return Object.assign(Object.assign({}, commonStyles), {}, (_Object$assign = {}, _Object$assign[sideY] = hasY ? '0' : '', _Object$assign[sideX] = hasX ? '0' : '', _Object$assign.transform = (win.devicePixelRatio || 1) < 2 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
  }

  return Object.assign(Object.assign({}, commonStyles), {}, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : '', _Object$assign2[sideX] = hasX ? x + "px" : '', _Object$assign2.transform = '', _Object$assign2));
}

function computeStyles(_ref4) {
  var state = _ref4.state,
      options = _ref4.options;
  var _options$gpuAccelerat = options.gpuAcceleration,
      gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat,
      _options$adaptive = options.adaptive,
      adaptive = _options$adaptive === void 0 ? true : _options$adaptive,
      _options$roundOffsets = options.roundOffsets,
      roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets;

  if (process.env.NODE_ENV !== "production") {
    var transitionProperty = getComputedStyle(state.elements.popper).transitionProperty || '';

    if (adaptive && ['transform', 'top', 'right', 'bottom', 'left'].some(function (property) {
      return transitionProperty.indexOf(property) >= 0;
    })) {
      console.warn(['Popper: Detected CSS transitions on at least one of the following', 'CSS properties: "transform", "top", "right", "bottom", "left".', '\n\n', 'Disable the "computeStyles" modifier\'s `adaptive` option to allow', 'for smooth transitions, or remove these properties from the CSS', 'transition declaration on the popper element if only transitioning', 'opacity or background-color for example.', '\n\n', 'We recommend using the popper element as a wrapper around an inner', 'element that can have any CSS property transitioned for animations.'].join(' '));
    }
  }

  var commonStyles = {
    placement: getBasePlacement(state.placement),
    popper: state.elements.popper,
    popperRect: state.rects.popper,
    gpuAcceleration: gpuAcceleration
  };

  if (state.modifiersData.popperOffsets != null) {
    state.styles.popper = Object.assign(Object.assign({}, state.styles.popper), mapToStyles(Object.assign(Object.assign({}, commonStyles), {}, {
      offsets: state.modifiersData.popperOffsets,
      position: state.options.strategy,
      adaptive: adaptive,
      roundOffsets: roundOffsets
    })));
  }

  if (state.modifiersData.arrow != null) {
    state.styles.arrow = Object.assign(Object.assign({}, state.styles.arrow), mapToStyles(Object.assign(Object.assign({}, commonStyles), {}, {
      offsets: state.modifiersData.arrow,
      position: 'absolute',
      adaptive: false,
      roundOffsets: roundOffsets
    })));
  }

  state.attributes.popper = Object.assign(Object.assign({}, state.attributes.popper), {}, {
    'data-popper-placement': state.placement
  });
} // eslint-disable-next-line import/no-unused-modules


var computeStyles$1 = {
  name: 'computeStyles',
  enabled: true,
  phase: 'beforeWrite',
  fn: computeStyles,
  data: {}
};

// and applies them to the HTMLElements such as popper and arrow

function applyStyles(_ref) {
  var state = _ref.state;
  Object.keys(state.elements).forEach(function (name) {
    var style = state.styles[name] || {};
    var attributes = state.attributes[name] || {};
    var element = state.elements[name]; // arrow is optional + virtual elements

    if (!isHTMLElement(element) || !getNodeName(element)) {
      return;
    } // Flow doesn't support to extend this property, but it's the most
    // effective way to apply styles to an HTMLElement
    // $FlowFixMe[cannot-write]


    Object.assign(element.style, style);
    Object.keys(attributes).forEach(function (name) {
      var value = attributes[name];

      if (value === false) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, value === true ? '' : value);
      }
    });
  });
}

function effect$1(_ref2) {
  var state = _ref2.state;
  var initialStyles = {
    popper: {
      position: state.options.strategy,
      left: '0',
      top: '0',
      margin: '0'
    },
    arrow: {
      position: 'absolute'
    },
    reference: {}
  };
  Object.assign(state.elements.popper.style, initialStyles.popper);

  if (state.elements.arrow) {
    Object.assign(state.elements.arrow.style, initialStyles.arrow);
  }

  return function () {
    Object.keys(state.elements).forEach(function (name) {
      var element = state.elements[name];
      var attributes = state.attributes[name] || {};
      var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]); // Set all values to an empty string to unset them

      var style = styleProperties.reduce(function (style, property) {
        style[property] = '';
        return style;
      }, {}); // arrow is optional + virtual elements

      if (!isHTMLElement(element) || !getNodeName(element)) {
        return;
      }

      Object.assign(element.style, style);
      Object.keys(attributes).forEach(function (attribute) {
        element.removeAttribute(attribute);
      });
    });
  };
} // eslint-disable-next-line import/no-unused-modules


var applyStyles$1 = {
  name: 'applyStyles',
  enabled: true,
  phase: 'write',
  fn: applyStyles,
  effect: effect$1,
  requires: ['computeStyles']
};

var defaultModifiers = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1];

var hash = {
  left: 'right',
  right: 'left',
  bottom: 'top',
  top: 'bottom'
};
function getOppositePlacement(placement) {
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash[matched];
  });
}

var hash$1 = {
  start: 'end',
  end: 'start'
};
function getOppositeVariationPlacement(placement) {
  return placement.replace(/start|end/g, function (matched) {
    return hash$1[matched];
  });
}

/*:: type OverflowsMap = { [ComputedPlacement]: number }; */

/*;; type OverflowsMap = { [key in ComputedPlacement]: number }; */
function computeAutoPlacement(state, options) {
  if (options === void 0) {
    options = {};
  }

  var _options = options,
      placement = _options.placement,
      boundary = _options.boundary,
      rootBoundary = _options.rootBoundary,
      padding = _options.padding,
      flipVariations = _options.flipVariations,
      _options$allowedAutoP = _options.allowedAutoPlacements,
      allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
  var variation = getVariation(placement);
  var placements$1 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function (placement) {
    return getVariation(placement) === variation;
  }) : basePlacements;
  var allowedPlacements = placements$1.filter(function (placement) {
    return allowedAutoPlacements.indexOf(placement) >= 0;
  });

  if (allowedPlacements.length === 0) {
    allowedPlacements = placements$1;

    if (process.env.NODE_ENV !== "production") {
      console.error(['Popper: The `allowedAutoPlacements` option did not allow any', 'placements. Ensure the `placement` option matches the variation', 'of the allowed placements.', 'For example, "auto" cannot be used to allow "bottom-start".', 'Use "auto-start" instead.'].join(' '));
    }
  } // $FlowFixMe[incompatible-type]: Flow seems to have problems with two array unions...


  var overflows = allowedPlacements.reduce(function (acc, placement) {
    acc[placement] = detectOverflow(state, {
      placement: placement,
      boundary: boundary,
      rootBoundary: rootBoundary,
      padding: padding
    })[getBasePlacement(placement)];
    return acc;
  }, {});
  return Object.keys(overflows).sort(function (a, b) {
    return overflows[a] - overflows[b];
  });
}

function getExpandedFallbackPlacements(placement) {
  if (getBasePlacement(placement) === auto) {
    return [];
  }

  var oppositePlacement = getOppositePlacement(placement);
  return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
}

function flip(_ref) {
  var state = _ref.state,
      options = _ref.options,
      name = _ref.name;

  if (state.modifiersData[name]._skip) {
    return;
  }

  var _options$mainAxis = options.mainAxis,
      checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
      _options$altAxis = options.altAxis,
      checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis,
      specifiedFallbackPlacements = options.fallbackPlacements,
      padding = options.padding,
      boundary = options.boundary,
      rootBoundary = options.rootBoundary,
      altBoundary = options.altBoundary,
      _options$flipVariatio = options.flipVariations,
      flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio,
      allowedAutoPlacements = options.allowedAutoPlacements;
  var preferredPlacement = state.options.placement;
  var basePlacement = getBasePlacement(preferredPlacement);
  var isBasePlacement = basePlacement === preferredPlacement;
  var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
  var placements = [preferredPlacement].concat(fallbackPlacements).reduce(function (acc, placement) {
    return acc.concat(getBasePlacement(placement) === auto ? computeAutoPlacement(state, {
      placement: placement,
      boundary: boundary,
      rootBoundary: rootBoundary,
      padding: padding,
      flipVariations: flipVariations,
      allowedAutoPlacements: allowedAutoPlacements
    }) : placement);
  }, []);
  var referenceRect = state.rects.reference;
  var popperRect = state.rects.popper;
  var checksMap = new Map();
  var makeFallbackChecks = true;
  var firstFittingPlacement = placements[0];

  for (var i = 0; i < placements.length; i++) {
    var placement = placements[i];

    var _basePlacement = getBasePlacement(placement);

    var isStartVariation = getVariation(placement) === start;
    var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
    var len = isVertical ? 'width' : 'height';
    var overflow = detectOverflow(state, {
      placement: placement,
      boundary: boundary,
      rootBoundary: rootBoundary,
      altBoundary: altBoundary,
      padding: padding
    });
    var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;

    if (referenceRect[len] > popperRect[len]) {
      mainVariationSide = getOppositePlacement(mainVariationSide);
    }

    var altVariationSide = getOppositePlacement(mainVariationSide);
    var checks = [];

    if (checkMainAxis) {
      checks.push(overflow[_basePlacement] <= 0);
    }

    if (checkAltAxis) {
      checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
    }

    if (checks.every(function (check) {
      return check;
    })) {
      firstFittingPlacement = placement;
      makeFallbackChecks = false;
      break;
    }

    checksMap.set(placement, checks);
  }

  if (makeFallbackChecks) {
    // `2` may be desired in some cases – research later
    var numberOfChecks = flipVariations ? 3 : 1;

    var _loop = function _loop(_i) {
      var fittingPlacement = placements.find(function (placement) {
        var checks = checksMap.get(placement);

        if (checks) {
          return checks.slice(0, _i).every(function (check) {
            return check;
          });
        }
      });

      if (fittingPlacement) {
        firstFittingPlacement = fittingPlacement;
        return "break";
      }
    };

    for (var _i = numberOfChecks; _i > 0; _i--) {
      var _ret = _loop(_i);

      if (_ret === "break") break;
    }
  }

  if (state.placement !== firstFittingPlacement) {
    state.modifiersData[name]._skip = true;
    state.placement = firstFittingPlacement;
    state.reset = true;
  }
} // eslint-disable-next-line import/no-unused-modules


var flip$1 = {
  name: 'flip',
  enabled: true,
  phase: 'main',
  fn: flip,
  requiresIfExists: ['offset'],
  data: {
    _skip: false
  }
};

function getAltAxis(axis) {
  return axis === 'x' ? 'y' : 'x';
}

function within(min, value, max) {
  return Math.max(min, Math.min(value, max));
}

function preventOverflow(_ref) {
  var state = _ref.state,
      options = _ref.options,
      name = _ref.name;
  var _options$mainAxis = options.mainAxis,
      checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
      _options$altAxis = options.altAxis,
      checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis,
      boundary = options.boundary,
      rootBoundary = options.rootBoundary,
      altBoundary = options.altBoundary,
      padding = options.padding,
      _options$tether = options.tether,
      tether = _options$tether === void 0 ? true : _options$tether,
      _options$tetherOffset = options.tetherOffset,
      tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
  var overflow = detectOverflow(state, {
    boundary: boundary,
    rootBoundary: rootBoundary,
    padding: padding,
    altBoundary: altBoundary
  });
  var basePlacement = getBasePlacement(state.placement);
  var variation = getVariation(state.placement);
  var isBasePlacement = !variation;
  var mainAxis = getMainAxisFromPlacement(basePlacement);
  var altAxis = getAltAxis(mainAxis);
  var popperOffsets = state.modifiersData.popperOffsets;
  var referenceRect = state.rects.reference;
  var popperRect = state.rects.popper;
  var tetherOffsetValue = typeof tetherOffset === 'function' ? tetherOffset(Object.assign(Object.assign({}, state.rects), {}, {
    placement: state.placement
  })) : tetherOffset;
  var data = {
    x: 0,
    y: 0
  };

  if (!popperOffsets) {
    return;
  }

  if (checkMainAxis) {
    var mainSide = mainAxis === 'y' ? top : left;
    var altSide = mainAxis === 'y' ? bottom : right;
    var len = mainAxis === 'y' ? 'height' : 'width';
    var offset = popperOffsets[mainAxis];
    var min = popperOffsets[mainAxis] + overflow[mainSide];
    var max = popperOffsets[mainAxis] - overflow[altSide];
    var additive = tether ? -popperRect[len] / 2 : 0;
    var minLen = variation === start ? referenceRect[len] : popperRect[len];
    var maxLen = variation === start ? -popperRect[len] : -referenceRect[len]; // We need to include the arrow in the calculation so the arrow doesn't go
    // outside the reference bounds

    var arrowElement = state.elements.arrow;
    var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
      width: 0,
      height: 0
    };
    var arrowPaddingObject = state.modifiersData['arrow#persistent'] ? state.modifiersData['arrow#persistent'].padding : getFreshSideObject();
    var arrowPaddingMin = arrowPaddingObject[mainSide];
    var arrowPaddingMax = arrowPaddingObject[altSide]; // If the reference length is smaller than the arrow length, we don't want
    // to include its full size in the calculation. If the reference is small
    // and near the edge of a boundary, the popper can overflow even if the
    // reference is not overflowing as well (e.g. virtual elements with no
    // width or height)

    var arrowLen = within(0, referenceRect[len], arrowRect[len]);
    var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - tetherOffsetValue : minLen - arrowLen - arrowPaddingMin - tetherOffsetValue;
    var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + tetherOffsetValue : maxLen + arrowLen + arrowPaddingMax + tetherOffsetValue;
    var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
    var clientOffset = arrowOffsetParent ? mainAxis === 'y' ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
    var offsetModifierValue = state.modifiersData.offset ? state.modifiersData.offset[state.placement][mainAxis] : 0;
    var tetherMin = popperOffsets[mainAxis] + minOffset - offsetModifierValue - clientOffset;
    var tetherMax = popperOffsets[mainAxis] + maxOffset - offsetModifierValue;
    var preventedOffset = within(tether ? Math.min(min, tetherMin) : min, offset, tether ? Math.max(max, tetherMax) : max);
    popperOffsets[mainAxis] = preventedOffset;
    data[mainAxis] = preventedOffset - offset;
  }

  if (checkAltAxis) {
    var _mainSide = mainAxis === 'x' ? top : left;

    var _altSide = mainAxis === 'x' ? bottom : right;

    var _offset = popperOffsets[altAxis];

    var _min = _offset + overflow[_mainSide];

    var _max = _offset - overflow[_altSide];

    var _preventedOffset = within(_min, _offset, _max);

    popperOffsets[altAxis] = _preventedOffset;
    data[altAxis] = _preventedOffset - _offset;
  }

  state.modifiersData[name] = data;
} // eslint-disable-next-line import/no-unused-modules


var preventOverflow$1 = {
  name: 'preventOverflow',
  enabled: true,
  phase: 'main',
  fn: preventOverflow,
  requiresIfExists: ['offset']
};

function arrow(_ref) {
  var _state$modifiersData$;

  var state = _ref.state,
      name = _ref.name;
  var arrowElement = state.elements.arrow;
  var popperOffsets = state.modifiersData.popperOffsets;
  var basePlacement = getBasePlacement(state.placement);
  var axis = getMainAxisFromPlacement(basePlacement);
  var isVertical = [left, right].indexOf(basePlacement) >= 0;
  var len = isVertical ? 'height' : 'width';

  if (!arrowElement || !popperOffsets) {
    return;
  }

  var paddingObject = state.modifiersData[name + "#persistent"].padding;
  var arrowRect = getLayoutRect(arrowElement);
  var minProp = axis === 'y' ? top : left;
  var maxProp = axis === 'y' ? bottom : right;
  var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets[axis] - state.rects.popper[len];
  var startDiff = popperOffsets[axis] - state.rects.reference[axis];
  var arrowOffsetParent = getOffsetParent(arrowElement);
  var clientSize = arrowOffsetParent ? axis === 'y' ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
  var centerToReference = endDiff / 2 - startDiff / 2; // Make sure the arrow doesn't overflow the popper if the center point is
  // outside of the popper bounds

  var min = paddingObject[minProp];
  var max = clientSize - arrowRect[len] - paddingObject[maxProp];
  var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
  var offset = within(min, center, max); // Prevents breaking syntax highlighting...

  var axisProp = axis;
  state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset, _state$modifiersData$.centerOffset = offset - center, _state$modifiersData$);
}

function effect$2(_ref2) {
  var state = _ref2.state,
      options = _ref2.options,
      name = _ref2.name;
  var _options$element = options.element,
      arrowElement = _options$element === void 0 ? '[data-popper-arrow]' : _options$element,
      _options$padding = options.padding,
      padding = _options$padding === void 0 ? 0 : _options$padding;

  if (arrowElement == null) {
    return;
  } // CSS selector


  if (typeof arrowElement === 'string') {
    arrowElement = state.elements.popper.querySelector(arrowElement);

    if (!arrowElement) {
      return;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    if (!isHTMLElement(arrowElement)) {
      console.error(['Popper: "arrow" element must be an HTMLElement (not an SVGElement).', 'To use an SVG arrow, wrap it in an HTMLElement that will be used as', 'the arrow.'].join(' '));
    }
  }

  if (!contains(state.elements.popper, arrowElement)) {
    if (process.env.NODE_ENV !== "production") {
      console.error(['Popper: "arrow" modifier\'s `element` must be a child of the popper', 'element.'].join(' '));
    }

    return;
  }

  state.elements.arrow = arrowElement;
  state.modifiersData[name + "#persistent"] = {
    padding: mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements))
  };
} // eslint-disable-next-line import/no-unused-modules


var arrow$1 = {
  name: 'arrow',
  enabled: true,
  phase: 'main',
  fn: arrow,
  effect: effect$2,
  requires: ['popperOffsets'],
  requiresIfExists: ['preventOverflow']
};

function distanceAndSkiddingToXY(placement, rects, offset) {
  var basePlacement = getBasePlacement(placement);
  var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;

  var _ref = typeof offset === 'function' ? offset(Object.assign(Object.assign({}, rects), {}, {
    placement: placement
  })) : offset,
      skidding = _ref[0],
      distance = _ref[1];

  skidding = skidding || 0;
  distance = (distance || 0) * invertDistance;
  return [left, right].indexOf(basePlacement) >= 0 ? {
    x: distance,
    y: skidding
  } : {
    x: skidding,
    y: distance
  };
}

function offset(_ref2) {
  var state = _ref2.state,
      options = _ref2.options,
      name = _ref2.name;
  var _options$offset = options.offset,
      offset = _options$offset === void 0 ? [0, 0] : _options$offset;
  var data = placements.reduce(function (acc, placement) {
    acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset);
    return acc;
  }, {});
  var _data$state$placement = data[state.placement],
      x = _data$state$placement.x,
      y = _data$state$placement.y;

  if (state.modifiersData.popperOffsets != null) {
    state.modifiersData.popperOffsets.x += x;
    state.modifiersData.popperOffsets.y += y;
  }

  state.modifiersData[name] = data;
} // eslint-disable-next-line import/no-unused-modules


var offset$1 = {
  name: 'offset',
  enabled: true,
  phase: 'main',
  requires: ['popperOffsets'],
  fn: offset
};

/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
// Spectrum elements that have arrows (tips) use a transform to rotate them.
// Popper overwrites those values, so we have to put them back
function computeArrowRotateStylesFn(ref) {
    /* c8 ignore next */
    if (!ref.state.styles || !ref.state.styles.arrow)
        return;
    let rotation;
    switch (ref.state.placement) {
        case 'bottom':
        case 'bottom-start':
        case 'bottom-end':
            rotation = 180;
            break;
        case 'top':
        case 'top-start':
        case 'top-end':
            return;
        case 'left':
        case 'left-start':
        case 'left-end':
            rotation = 270;
            break;
        case 'right':
        case 'right-start':
        case 'right-end':
            rotation = 90;
            break;
        /* c8 ignore next 2 */
        default:
            return;
    }
    ref.state.styles.arrow.transform += ` rotate(${rotation}deg)`;
    // Manage Spectrum CSS usage of negative left margin for centering.
    ref.state.styles.arrow.marginLeft = '0';
    // Manage Spectrum CSS usage of negative top margin for centering.
    ref.state.styles.arrow.marginTop = '0';
    return;
}
const computeArrowRotateStyles = {
    name: 'computeArrowRotateStyles',
    enabled: true,
    phase: 'beforeWrite',
    requiresIfExists: ['arrow'],
    fn: computeArrowRotateStylesFn,
    data: {},
};

var maxSize = {
  name: 'maxSize',
  enabled: true,
  phase: 'main',
  requiresIfExists: ['offset', 'preventOverflow', 'flip'],
  fn: function fn(_ref) {
    var state = _ref.state,
        name = _ref.name,
        options = _ref.options;
    var overflow = detectOverflow(state, options);

    var _ref2 = state.modifiersData.preventOverflow || {
      x: 0,
      y: 0
    },
        x = _ref2.x,
        y = _ref2.y;

    var _state$rects$popper = state.rects.popper,
        width = _state$rects$popper.width,
        height = _state$rects$popper.height;

    var _state$placement$spli = state.placement.split('-'),
        basePlacement = _state$placement$spli[0];

    var widthProp = basePlacement === 'left' ? 'left' : 'right';
    var heightProp = basePlacement === 'top' ? 'top' : 'bottom';
    state.modifiersData[name] = {
      width: width - overflow[widthProp] - x,
      height: height - overflow[heightProp] - y
    };
  }
};

/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const appliedSizeDefaults = new WeakMap();
const applyMaxSize = {
    name: 'applyMaxSize',
    enabled: true,
    phase: 'beforeWrite',
    requires: ['maxSize'],
    fn({ state }) {
        const { height: maxHeight } = state.modifiersData.maxSize;
        if (!appliedSizeDefaults.has(state.elements.popper)) {
            appliedSizeDefaults.set(state.elements.popper, state.rects.popper.height);
        }
        const actualHeight = appliedSizeDefaults.get(state.elements.popper);
        const constrainHeight = maxHeight < actualHeight;
        const appliedHeight = constrainHeight ? `${maxHeight}px` : '';
        state.styles.popper.maxHeight = appliedHeight;
        state.styles.popper.height = appliedHeight;
    },
};

/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const createPopper = popperGenerator({
    defaultModifiers: [
        ...defaultModifiers,
        flip$1,
        preventOverflow$1,
        arrow$1,
        offset$1,
        computeArrowRotateStyles,
    ],
});

/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const styles = css `
@keyframes spOverlayFadeIn{0%{opacity:0;transform:var(--sp-overlay-from)}to{opacity:1;transform:translate(0)}}@keyframes spOverlayFadeOut{0%{opacity:1;transform:translate(0)}to{opacity:0;transform:var(--sp-overlay-from)}}:host{z-index:1000;position:absolute;display:inline-block;pointer-events:none}#contents,sp-theme{height:100%}#contents{display:inline-block;pointer-events:none;animation-duration:var(--spectrum-global-animation-duration-200,.16s);animation-timing-function:var(--spectrum-global-animation-ease-out,ease-out);opacity:1;visibility:visible}:host([data-popper-placement*=top]) #contents{--sp-overlay-from:translateY(var(--spectrum-global-dimension-size-75))}:host([data-popper-placement*=right]) #contents{--sp-overlay-from:translateX(calc(-1*var(--spectrum-global-dimension-size-75)))}:host([data-popper-placement*=bottom]) #contents{--sp-overlay-from:translateY(calc(-1*var(--spectrum-global-dimension-size-75)))}:host([data-popper-placement*=left]) #contents{--sp-overlay-from:translateX(var(--spectrum-global-dimension-size-75))}:host([animating]) ::slotted(*){pointer-events:none}#contents ::slotted(*){position:relative}
`;

/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const stateMachine = {
    initial: 'idle',
    states: {
        idle: {
            on: {
                active: 'active',
            },
        },
        active: {
            on: {
                visible: 'visible',
                hiding: 'hiding',
                idle: 'idle',
            },
        },
        visible: {
            on: {
                hiding: 'hiding',
                idle: 'idle',
            },
        },
        hiding: {
            on: {
                dispose: 'dispose',
            },
        },
        dispose: {
            on: {
                disposed: 'disposed',
            },
        },
        disposed: {
            on: {},
        },
    },
};
const stateTransition = (state, event) => {
    if (!state)
        return stateMachine.initial;
    /* c8 ignore next */
    if (!event)
        return state;
    return stateMachine.states[state].on[event] || state;
};
class ActiveOverlay extends SpectrumElement {
    constructor() {
        super();
        this._state = stateTransition();
        this.animating = false;
        this.tabbingAway = false;
        this.offset = 6;
        this.interaction = 'hover';
        this.positionAnimationFrame = 0;
        this.willNotifyClosed = false;
        this.handleInlineTriggerKeydown = (event) => {
            const { code, shiftKey } = event;
            /* c8 ignore next */
            if (code !== 'Tab')
                return;
            if (shiftKey) {
                this.tabbingAway = true;
                this.dispatchEvent(new Event('close'));
                return;
            }
            event.stopPropagation();
            event.preventDefault();
            this.focus();
        };
        this.stealOverlayContentPromise = Promise.resolve();
        this.stealOverlayContentPromise = new Promise((res) => (this.stealOverlayContentResolver = res));
    }
    get state() {
        return this._state;
    }
    set state(state) {
        const nextState = stateTransition(this.state, state);
        if (nextState === this.state) {
            return;
        }
        this._state = nextState;
        if (this.state === 'active' ||
            this.state === 'visible' ||
            this.state === 'hiding') {
            this.setAttribute('state', this.state);
        }
        else {
            this.removeAttribute('state');
        }
    }
    focus() {
        const firstFocusable = this.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
            this.removeAttribute('tabindex');
            /* c8 ignore next 3 */
        }
        else {
            super.focus();
        }
    }
    get hasTheme() {
        return !!this.color || !!this.scale;
    }
    static get styles() {
        return [styles];
    }
    feature() {
        this.tabIndex = 0;
        if (this.interaction === 'modal') {
            this.slot = 'open';
        }
    }
    obscure() {
        if (this.interaction === 'modal') {
            this.removeAttribute('slot');
        }
    }
    firstUpdated(changedProperties) {
        super.firstUpdated(changedProperties);
        /* c8 ignore next */
        if (!this.overlayContent)
            return;
        this.stealOverlayContent(this.overlayContent);
        /* c8 ignore next */
        if (!this.overlayContent || !this.trigger)
            return;
        if (this.placement && this.placement !== 'none') {
            this.popper = createPopper(this.trigger, this, {
                placement: this.placement,
                modifiers: [
                    maxSize,
                    applyMaxSize,
                    {
                        name: 'arrow',
                        options: {
                            element: this.overlayContentTip,
                        },
                    },
                    {
                        name: 'offset',
                        options: {
                            offset: [0, this.offset],
                        },
                    },
                ],
            });
        }
        this.state = 'active';
        document.addEventListener('sp-update-overlays', () => {
            this.updateOverlayPosition();
            this.state = 'visible';
        });
        this.feature();
        this.updateOverlayPosition()
            .then(() => this.applyContentAnimation('spOverlayFadeIn'))
            .then(() => {
            if (this.receivesFocus) {
                this.focus();
            }
        });
    }
    updateOverlayPopperPlacement() {
        /* c8 ignore next */
        if (!this.overlayContent)
            return;
        if (this.dataPopperPlacement) {
            // Copy this attribute to the actual overlay node so that it can use
            // the attribute for styling shadow DOM elements based on the side
            // that popper has chosen for it
            this.overlayContent.setAttribute('placement', this.dataPopperPlacement);
        }
        else if (this.originalPlacement) {
            this.overlayContent.setAttribute('placement', this.originalPlacement);
        }
        else {
            this.overlayContent.removeAttribute('placement');
        }
    }
    updated(changedProperties) {
        if (changedProperties.has('dataPopperPlacement')) {
            this.updateOverlayPopperPlacement();
        }
    }
    open(openDetail) {
        this.extractDetail(openDetail);
    }
    extractDetail(detail) {
        this.overlayContent = detail.content;
        this.overlayContentTip = detail.contentTip;
        this.trigger = detail.trigger;
        this.placement = detail.placement;
        this.offset = detail.offset;
        this.interaction = detail.interaction;
        this.color = detail.theme.color;
        this.scale = detail.theme.scale;
        this.receivesFocus = detail.receivesFocus;
    }
    dispose() {
        /* c8 ignore next */
        if (this.state !== 'dispose')
            return;
        /* c8 ignore next 4 */
        if (this.timeout) {
            clearTimeout(this.timeout);
            delete this.timeout;
        }
        if (this.popper) {
            this.popper.destroy();
            this.popper = undefined;
        }
        if (this.returnFocusElement) {
            this.returnFocusElement.remove();
            this.trigger.removeEventListener('keydown', this.handleInlineTriggerKeydown);
        }
        this.returnOverlayContent();
        this.state = 'disposed';
        if (this.willNotifyClosed) {
            this.overlayContent.dispatchEvent(new Event('sp-overlay-closed'));
            this.willNotifyClosed = false;
        }
    }
    stealOverlayContent(element) {
        /* c8 ignore next */
        if (this.placeholder || !element)
            return;
        if (!this.placeholder) {
            this.placeholder = document.createComment('placeholder for ' + element.nodeName);
        }
        const parentElement = element.parentElement || element.getRootNode();
        if (parentElement) {
            parentElement.replaceChild(this.placeholder, element);
        }
        this.overlayContent = element;
        this.originalSlot =
            this.overlayContent.getAttribute('slot') || undefined;
        this.overlayContent.setAttribute('slot', 'overlay');
        this.appendChild(this.overlayContent);
        this.originalPlacement = this.overlayContent.getAttribute('placement');
        this.stealOverlayContentResolver();
    }
    returnOverlayContent() {
        /* c8 ignore next */
        if (!this.overlayContent)
            return;
        if (this.originalSlot) {
            this.overlayContent.setAttribute('slot', this.originalSlot);
            delete this.originalSlot;
        }
        else {
            this.overlayContent.removeAttribute('slot');
        }
        if (this.placeholder) {
            const parentElement = this.placeholder.parentElement ||
                this.placeholder.getRootNode();
            if (parentElement) {
                parentElement.replaceChild(this.overlayContent, this.placeholder);
                this.willNotifyClosed = true;
            }
        }
        if (this.originalPlacement) {
            this.overlayContent.setAttribute('placement', this.originalPlacement);
            delete this.originalPlacement;
        }
        delete this.placeholder;
    }
    async updateOverlayPosition() {
        if (this.popper) {
            await this.popper.update();
        }
    }
    async hide(animated = true) {
        this.state = 'hiding';
        if (animated) {
            await this.applyContentAnimation('spOverlayFadeOut');
        }
        this.state = 'dispose';
    }
    schedulePositionUpdate() {
        // Edge needs a little time to update the DOM before computing the layout
        cancelAnimationFrame(this.positionAnimationFrame);
        this.positionAnimationFrame = requestAnimationFrame(() => this.updateOverlayPosition());
    }
    onSlotChange() {
        this.schedulePositionUpdate();
    }
    connectedCallback() {
        super.connectedCallback();
        this.schedulePositionUpdate();
    }
    applyContentAnimation(animation) {
        return new Promise((resolve) => {
            const contents = this.shadowRoot.querySelector('#contents');
            const doneHandler = (event) => {
                if (animation !== event.animationName)
                    return;
                contents.removeEventListener('animationend', doneHandler);
                contents.removeEventListener('animationcancel', doneHandler);
                this.animating = false;
                resolve(event.type === 'animationcancel');
            };
            contents.addEventListener('animationend', doneHandler);
            contents.addEventListener('animationcancel', doneHandler);
            contents.style.animationName = animation;
            this.animating = true;
        });
    }
    renderTheme(content) {
        const { color, scale } = this;
        return html `
            <sp-theme color=${ifDefined(color)} scale=${ifDefined(scale)}>
                ${content}
            </sp-theme>
        `;
    }
    render() {
        const content = html `
            <div id="contents">
                <slot @slotchange=${this.onSlotChange} name="overlay"></slot>
            </div>
        `;
        return this.hasTheme ? this.renderTheme(content) : content;
    }
    static create(details) {
        const overlay = new ActiveOverlay();
        if (details.content) {
            overlay.open(details);
        }
        return overlay;
    }
    async _getUpdateComplete() {
        await super._getUpdateComplete();
        await this.stealOverlayContentPromise;
    }
}
__decorate([
    property()
], ActiveOverlay.prototype, "_state", void 0);
__decorate([
    property({ reflect: true, type: Boolean })
], ActiveOverlay.prototype, "animating", void 0);
__decorate([
    property({ reflect: true })
], ActiveOverlay.prototype, "placement", void 0);
__decorate([
    property({ attribute: false })
], ActiveOverlay.prototype, "color", void 0);
__decorate([
    property({ attribute: false })
], ActiveOverlay.prototype, "receivesFocus", void 0);
__decorate([
    property({ attribute: false })
], ActiveOverlay.prototype, "scale", void 0);
__decorate([
    property({ attribute: 'data-popper-placement' })
], ActiveOverlay.prototype, "dataPopperPlacement", void 0);

/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const DEFAULT_WARMUP = 1000;
const DEFAULT_COOLDOWN = 1000;
/**
 * A timer to help with implementation of warnup/cooldown behavior as described here:
 * https://spectrum.adobe.com/page/tooltip/#Immediate-or-delayed-appearance
 */
class OverlayTimer {
    constructor(options = {}) {
        this.warmUpDelay = DEFAULT_WARMUP;
        this.coolDownDelay = DEFAULT_COOLDOWN;
        this.isWarm = false;
        this.timeout = 0;
        Object.assign(this, options);
    }
    async openTimer(component) {
        this.cancelCooldownTimer();
        if (!this.component || !component.isSameNode(this.component)) {
            if (this.component) {
                this.close(this.component);
                this.cancelCooldownTimer();
            }
            this.component = component;
            if (this.isWarm) {
                return false;
            }
            this.promise = new Promise((resolve) => {
                this.resolve = resolve;
                this.timeout = window.setTimeout(() => {
                    if (this.resolve) {
                        this.resolve(false);
                        this.isWarm = true;
                    }
                }, this.warmUpDelay);
            });
            return this.promise;
        }
        else if (this.promise) {
            return this.promise;
        }
        else {
            // This should never happen
            throw new Error('Inconsistent state');
        }
    }
    close(component) {
        if (this.component && this.component.isSameNode(component)) {
            this.resetCooldownTimer();
            if (this.timeout > 0) {
                clearTimeout(this.timeout);
                this.timeout = 0;
            }
            if (this.resolve) {
                this.resolve(true);
                delete this.resolve;
            }
            delete this.promise;
            delete this.component;
        }
    }
    resetCooldownTimer() {
        if (this.isWarm) {
            if (this.cooldownTimeout) {
                window.clearTimeout(this.cooldownTimeout);
            }
            this.cooldownTimeout = window.setTimeout(() => {
                this.isWarm = false;
                delete this.cooldownTimeout;
            }, this.coolDownDelay);
        }
    }
    cancelCooldownTimer() {
        if (this.cooldownTimeout) {
            window.clearTimeout(this.cooldownTimeout);
        }
        delete this.cooldownTimeout;
    }
}

/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
customElements.define('active-overlay', ActiveOverlay);

/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
function isLeftClick(event) {
    return event.button === 0;
}
function hasModifier(event) {
    return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}
class OverlayStack {
    constructor() {
        this.overlays = [];
        this.preventMouseRootClose = false;
        this.root = document.body;
        this.handlingResize = false;
        this.overlayTimer = new OverlayTimer();
        this.canTabTrap = true;
        this.trappingInited = false;
        this.handleMouseCapture = (event) => {
            const topOverlay = this.topOverlay;
            if (!event.target ||
                !topOverlay ||
                !topOverlay.overlayContent ||
                hasModifier(event) ||
                !isLeftClick(event)) {
                this.preventMouseRootClose = true;
                return;
            }
            if (event.target instanceof Node) {
                const path = event.composedPath();
                if (path.indexOf(topOverlay.overlayContent) >= 0) {
                    this.preventMouseRootClose = true;
                    return;
                }
                this.preventMouseRootClose = false;
            }
        };
        this.handleMouse = () => {
            if (!this.preventMouseRootClose) {
                this.closeTopOverlay();
            }
        };
        this.handleKeyUp = (event) => {
            if (event.code === 'Escape') {
                const overlay = this.topOverlay;
                this.closeTopOverlay();
                overlay && overlay.trigger.focus();
            }
        };
        this.handleResize = () => {
            if (this.handlingResize)
                return;
            this.handlingResize = true;
            requestAnimationFrame(async () => {
                const promises = this.overlays.map((overlay) => overlay.updateOverlayPosition());
                await Promise.all(promises);
                this.handlingResize = false;
            });
        };
        this.addEventListeners();
    }
    initTabTrapping() {
        /* c8 ignore next 4 */
        if (this.document.body.shadowRoot) {
            this.canTabTrap = false;
            return;
        }
        this.document.body.attachShadow({ mode: 'open' });
        /* c8 ignore next 3 */
        if (!this.document.body.shadowRoot) {
            return;
        }
        const root = this.document.body.shadowRoot;
        root.innerHTML = `
            <div id="actual"><slot></slot></div>
            <style>
            #actual {
                position: relative;
                height: 100%;
                z-index: 0;
                min-height: 100vh;
            }
            #holder {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-flow: column;
                height: 100%;
                width: 100%;
                top: 0;
                left: 0;
                position: fixed;
            }
            #holder[hidden] {
                display: none !important;
            }
            #actual[tabindex="-1"] {
                pointer-events: none;  /* just in case? */
            }
            </style>
            <div id="holder" hidden><slot name="open"></slot></div>
        `;
        this.tabTrapper = root.querySelector('#actual');
        this.overlayHolder = root.querySelector('#holder');
        this.tabTrapper.attachShadow({ mode: 'open' });
        if (this.tabTrapper.shadowRoot) {
            this.tabTrapper.shadowRoot.innerHTML = '<slot></slot>';
        }
    }
    startTabTrapping() {
        if (!this.trappingInited) {
            this.initTabTrapping();
            this.trappingInited = true;
        }
        /* c8 ignore next 3 */
        if (!this.canTabTrap) {
            return;
        }
        this.tabTrapper.tabIndex = -1;
        this.overlayHolder.hidden = false;
    }
    stopTabTrapping() {
        /* c8 ignore next 3 */
        if (!this.canTabTrap || !this.trappingInited) {
            return;
        }
        this.tabTrapper.removeAttribute('tabindex');
        this.overlayHolder.hidden = true;
    }
    get document() {
        return this.root.ownerDocument /* c8 ignore next */ || document;
    }
    get topOverlay() {
        return this.overlays.slice(-1)[0];
    }
    findOverlayForContent(overlayContent) {
        for (const item of this.overlays) {
            if (overlayContent.isSameNode(item.overlayContent)) {
                return item;
            }
        }
        return undefined;
    }
    addEventListeners() {
        this.document.addEventListener('click', this.handleMouseCapture, true);
        this.document.addEventListener('click', this.handleMouse);
        this.document.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('resize', this.handleResize);
    }
    isClickOverlayActiveForTrigger(trigger) {
        return this.overlays.some((item) => trigger.isSameNode(item.trigger) &&
            item.interaction === 'click');
    }
    async openOverlay(details) {
        if (this.findOverlayForContent(details.content)) {
            return false;
        }
        if (details.interaction === 'modal') {
            this.startTabTrapping();
        }
        if (details.delayed) {
            const promise = this.overlayTimer.openTimer(details.content);
            const cancelled = await promise;
            if (cancelled) {
                return promise;
            }
        }
        if (details.interaction === 'click') {
            this.closeAllHoverOverlays();
        }
        else if (details.interaction === 'hover' &&
            this.isClickOverlayActiveForTrigger(details.trigger)) {
            // Don't show a hover popover if the click popover is already active
            return true;
        }
        if (this.overlays.length) {
            const topOverlay = this.overlays[this.overlays.length - 1];
            topOverlay.obscure();
        }
        const activeOverlay = ActiveOverlay.create(details);
        document.body.appendChild(activeOverlay);
        /**
         * The following work to make the new overlay the "top" of the stack
         * has to happen AFTER the current call stack completes in case there
         * is work there in to remove the previous "top" overlay.
         */
        return new Promise((res) => requestAnimationFrame(res)).then(async () => {
            this.overlays.push(activeOverlay);
            await activeOverlay.updateComplete;
            this.addOverlayEventListeners(activeOverlay);
            if (details.receivesFocus === 'auto') {
                activeOverlay.focus();
            }
            return false;
        });
    }
    addOverlayEventListeners(activeOverlay) {
        activeOverlay.addEventListener('close', () => {
            this.hideAndCloseOverlay(activeOverlay);
        });
        switch (activeOverlay.interaction) {
            case 'replace':
                this.addReplaceOverlayEventListeners(activeOverlay);
                break;
            case 'inline':
                this.addInlineOverlayEventListeners(activeOverlay);
                break;
        }
    }
    addReplaceOverlayEventListeners(activeOverlay) {
        activeOverlay.addEventListener('keydown', (event) => {
            const { code } = event;
            /* c8 ignore next */
            if (code !== 'Tab')
                return;
            event.stopPropagation();
            this.closeOverlay(activeOverlay.overlayContent);
            activeOverlay.tabbingAway = true;
            activeOverlay.trigger.focus();
            activeOverlay.trigger.dispatchEvent(new KeyboardEvent('keydown', event));
        });
    }
    addInlineOverlayEventListeners(activeOverlay) {
        if (!activeOverlay.returnFocusElement) {
            activeOverlay.returnFocusElement = document.createElement('span');
            activeOverlay.returnFocusElement.tabIndex = -1;
            if (activeOverlay.trigger.hasAttribute('slot')) {
                activeOverlay.returnFocusElement.slot =
                    activeOverlay.trigger.slot;
            }
            activeOverlay.trigger.insertAdjacentElement('afterend', activeOverlay.returnFocusElement);
        }
        activeOverlay.trigger.addEventListener('keydown', activeOverlay.handleInlineTriggerKeydown);
        activeOverlay.addEventListener('keydown', (event) => {
            const { code, shiftKey } = event;
            /* c8 ignore next */
            if (code !== 'Tab')
                return;
            activeOverlay.tabbingAway = true;
            if (shiftKey && activeOverlay.returnFocusElement) {
                activeOverlay.returnFocusElement.focus();
                return;
            }
            event.stopPropagation();
            this.closeOverlay(activeOverlay.overlayContent);
            activeOverlay.trigger.focus();
        });
    }
    closeOverlay(content) {
        this.overlayTimer.close(content);
        requestAnimationFrame(() => {
            const overlay = this.findOverlayForContent(content);
            this.hideAndCloseOverlay(overlay);
        });
    }
    closeAllHoverOverlays() {
        for (const overlay of this.overlays) {
            if (overlay.interaction === 'hover') {
                this.hideAndCloseOverlay(overlay, false);
            }
        }
    }
    async hideAndCloseOverlay(overlay, animated) {
        if (overlay) {
            await overlay.hide(animated);
            if (overlay.state != 'dispose')
                return;
            const index = this.overlays.indexOf(overlay);
            if (index >= 0) {
                this.overlays.splice(index, 1);
            }
            if (this.overlays.length) {
                const topOverlay = this.overlays[this.overlays.length - 1];
                topOverlay.feature();
                if (topOverlay.interaction === 'modal') {
                    topOverlay.focus();
                }
                else {
                    this.stopTabTrapping();
                }
            }
            else {
                this.stopTabTrapping();
                if (overlay.interaction === 'modal' ||
                    ((overlay.interaction === 'replace' ||
                        overlay.interaction === 'inline') &&
                        !overlay.tabbingAway)) {
                    overlay.trigger.focus();
                }
                overlay.tabbingAway = false;
            }
            overlay.remove();
            overlay.dispose();
        }
    }
    closeTopOverlay() {
        return this.hideAndCloseOverlay(this.topOverlay);
    }
}

/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
/**
 * This class allows access to the overlay system which allows a client to
 * position an element in the overlay positioned relative to another node.
 */
class Overlay {
    /**
     *
     * @param owner the parent element we will use to position the overlay element
     * @param interaction the type of interaction that caused this overlay to be shown
     * @param overlayElement the item to display as an overlay
     */
    constructor(owner, interaction, overlayElement) {
        this.isOpen = false;
        this.owner = owner;
        this.overlayElement = overlayElement;
        this.interaction = interaction;
    }
    /**
     * Open an overlay
     *
     * @param owner the parent element we will use to position the overlay element
     * @param interaction the type of interaction that caused this overlay to be shown
     * @param overlayElement the item to display as an overlay
     * @param options display parameters
     * @param options.delayed if true delay opening of the overlay based on the global warmup/cooldown timer
     * @param options.offset distance to offset the overlay
     * @param options.placement side on which to position the overlay
     * @returns an Overlay object which can be used to close the overlay
     */
    static async open(owner, interaction, overlayElement, options) {
        const overlay = new Overlay(owner, interaction, overlayElement);
        await overlay.open(options);
        return () => {
            overlay.close();
        };
    }
    static update() {
        const overlayUpdateEvent = new CustomEvent('sp-update-overlays', {
            bubbles: true,
            composed: true,
            cancelable: true,
        });
        document.dispatchEvent(overlayUpdateEvent);
    }
    /**
     * Open an overlay
     *
     * @param options display parameters
     * @param options.delayed delay before opening the overlay
     * @param options.offset distance to offset the overlay
     * @param options.placement side on which to position the overlay
     * @returns a Promise that resolves to true if this operation was cancelled
     */
    async open({ delayed, offset = 0, placement = 'top', receivesFocus, }) {
        /* c8 ignore next */
        if (this.isOpen)
            return true;
        if (delayed === undefined) {
            delayed = this.overlayElement.hasAttribute('delayed');
        }
        const queryThemeDetail = {
            color: undefined,
            scale: undefined,
        };
        const queryThemeEvent = new CustomEvent('sp-query-theme', {
            bubbles: true,
            composed: true,
            detail: queryThemeDetail,
            cancelable: true,
        });
        this.owner.dispatchEvent(queryThemeEvent);
        const overlayDetailQuery = {};
        const queryOverlayDetailEvent = new CustomEvent('sp-overlay-query', {
            bubbles: true,
            composed: true,
            detail: overlayDetailQuery,
            cancelable: true,
        });
        this.overlayElement.dispatchEvent(queryOverlayDetailEvent);
        await Overlay.overlayStack.openOverlay(Object.assign({ content: this.overlayElement, contentTip: overlayDetailQuery.overlayContentTipElement, delayed, offset: offset, placement: placement, trigger: this.owner, interaction: this.interaction, theme: queryThemeDetail, receivesFocus }, overlayDetailQuery));
        this.isOpen = true;
        return true;
    }
    /**
     * Close the overlay if it is open
     */
    close() {
        Overlay.overlayStack.closeOverlay(this.overlayElement);
    }
}
Overlay.overlayStack = new OverlayStack();

export { Overlay };
