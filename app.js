/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * True if the custom elements polyfill is in use.
 */
const isCEPolyfill = typeof window !== 'undefined' &&
    window.customElements != null &&
    window.customElements.polyfillWrapFlushCallback !==
        undefined;
/**
 * Removes nodes, starting from `start` (inclusive) to `end` (exclusive), from
 * `container`.
 */
const removeNodes = (container, start, end = null) => {
    while (start !== end) {
        const n = start.nextSibling;
        container.removeChild(start);
        start = n;
    }
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An expression marker with embedded unique key to avoid collision with
 * possible text in templates.
 */
const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
/**
 * An expression marker used text-positions, multi-binding attributes, and
 * attributes with markup-like text values.
 */
const nodeMarker = `<!--${marker}-->`;
const markerRegex = new RegExp(`${marker}|${nodeMarker}`);
/**
 * Suffix appended to all bound attribute names.
 */
const boundAttributeSuffix = '$lit$';
/**
 * An updatable Template that tracks the location of dynamic parts.
 */
class Template {
    constructor(result, element) {
        this.parts = [];
        this.element = element;
        const nodesToRemove = [];
        const stack = [];
        // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
        const walker = document.createTreeWalker(element.content, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
        // Keeps track of the last index associated with a part. We try to delete
        // unnecessary nodes, but we never want to associate two different parts
        // to the same index. They must have a constant node between.
        let lastPartIndex = 0;
        let index = -1;
        let partIndex = 0;
        const { strings, values: { length } } = result;
        while (partIndex < length) {
            const node = walker.nextNode();
            if (node === null) {
                // We've exhausted the content inside a nested template element.
                // Because we still have parts (the outer for-loop), we know:
                // - There is a template in the stack
                // - The walker will find a nextNode outside the template
                walker.currentNode = stack.pop();
                continue;
            }
            index++;
            if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                if (node.hasAttributes()) {
                    const attributes = node.attributes;
                    const { length } = attributes;
                    // Per
                    // https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
                    // attributes are not guaranteed to be returned in document order.
                    // In particular, Edge/IE can return them out of order, so we cannot
                    // assume a correspondence between part index and attribute index.
                    let count = 0;
                    for (let i = 0; i < length; i++) {
                        if (endsWith(attributes[i].name, boundAttributeSuffix)) {
                            count++;
                        }
                    }
                    while (count-- > 0) {
                        // Get the template literal section leading up to the first
                        // expression in this attribute
                        const stringForPart = strings[partIndex];
                        // Find the attribute name
                        const name = lastAttributeNameRegex.exec(stringForPart)[2];
                        // Find the corresponding attribute
                        // All bound attributes have had a suffix added in
                        // TemplateResult#getHTML to opt out of special attribute
                        // handling. To look up the attribute value we also need to add
                        // the suffix.
                        const attributeLookupName = name.toLowerCase() + boundAttributeSuffix;
                        const attributeValue = node.getAttribute(attributeLookupName);
                        node.removeAttribute(attributeLookupName);
                        const statics = attributeValue.split(markerRegex);
                        this.parts.push({ type: 'attribute', index, name, strings: statics });
                        partIndex += statics.length - 1;
                    }
                }
                if (node.tagName === 'TEMPLATE') {
                    stack.push(node);
                    walker.currentNode = node.content;
                }
            }
            else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                const data = node.data;
                if (data.indexOf(marker) >= 0) {
                    const parent = node.parentNode;
                    const strings = data.split(markerRegex);
                    const lastIndex = strings.length - 1;
                    // Generate a new text node for each literal section
                    // These nodes are also used as the markers for node parts
                    for (let i = 0; i < lastIndex; i++) {
                        let insert;
                        let s = strings[i];
                        if (s === '') {
                            insert = createMarker();
                        }
                        else {
                            const match = lastAttributeNameRegex.exec(s);
                            if (match !== null && endsWith(match[2], boundAttributeSuffix)) {
                                s = s.slice(0, match.index) + match[1] +
                                    match[2].slice(0, -boundAttributeSuffix.length) + match[3];
                            }
                            insert = document.createTextNode(s);
                        }
                        parent.insertBefore(insert, node);
                        this.parts.push({ type: 'node', index: ++index });
                    }
                    // If there's no text, we must insert a comment to mark our place.
                    // Else, we can trust it will stick around after cloning.
                    if (strings[lastIndex] === '') {
                        parent.insertBefore(createMarker(), node);
                        nodesToRemove.push(node);
                    }
                    else {
                        node.data = strings[lastIndex];
                    }
                    // We have a part for each match found
                    partIndex += lastIndex;
                }
            }
            else if (node.nodeType === 8 /* Node.COMMENT_NODE */) {
                if (node.data === marker) {
                    const parent = node.parentNode;
                    // Add a new marker node to be the startNode of the Part if any of
                    // the following are true:
                    //  * We don't have a previousSibling
                    //  * The previousSibling is already the start of a previous part
                    if (node.previousSibling === null || index === lastPartIndex) {
                        index++;
                        parent.insertBefore(createMarker(), node);
                    }
                    lastPartIndex = index;
                    this.parts.push({ type: 'node', index });
                    // If we don't have a nextSibling, keep this node so we have an end.
                    // Else, we can remove it to save future costs.
                    if (node.nextSibling === null) {
                        node.data = '';
                    }
                    else {
                        nodesToRemove.push(node);
                        index--;
                    }
                    partIndex++;
                }
                else {
                    let i = -1;
                    while ((i = node.data.indexOf(marker, i + 1)) !== -1) {
                        // Comment node has a binding marker inside, make an inactive part
                        // The binding won't work, but subsequent bindings will
                        // TODO (justinfagnani): consider whether it's even worth it to
                        // make bindings in comments work
                        this.parts.push({ type: 'node', index: -1 });
                        partIndex++;
                    }
                }
            }
        }
        // Remove text binding nodes after the walk to not disturb the TreeWalker
        for (const n of nodesToRemove) {
            n.parentNode.removeChild(n);
        }
    }
}
const endsWith = (str, suffix) => {
    const index = str.length - suffix.length;
    return index >= 0 && str.slice(index) === suffix;
};
const isTemplatePartActive = (part) => part.index !== -1;
// Allows `document.createComment('')` to be renamed for a
// small manual size-savings.
const createMarker = () => document.createComment('');
/**
 * This regex extracts the attribute name preceding an attribute-position
 * expression. It does this by matching the syntax allowed for attributes
 * against the string literal directly preceding the expression, assuming that
 * the expression is in an attribute-value position.
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \x09\x0a\x0c\x0d" are HTML space characters:
 * https://www.w3.org/TR/html5/infrastructure.html#space-characters
 *
 * "\0-\x1F\x7F-\x9F" are Unicode control characters, which includes every
 * space character except " ".
 *
 * So an attribute is:
 *  * The name: any character except a control character, space character, ('),
 *    ("), ">", "=", or "/"
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const lastAttributeNameRegex = 
// eslint-disable-next-line no-control-regex
/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const walkerNodeFilter = 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */;
/**
 * Removes the list of nodes from a Template safely. In addition to removing
 * nodes from the Template, the Template part indices are updated to match
 * the mutated Template DOM.
 *
 * As the template is walked the removal state is tracked and
 * part indices are adjusted as needed.
 *
 * div
 *   div#1 (remove) <-- start removing (removing node is div#1)
 *     div
 *       div#2 (remove)  <-- continue removing (removing node is still div#1)
 *         div
 * div <-- stop removing since previous sibling is the removing node (div#1,
 * removed 4 nodes)
 */
function removeNodesFromTemplate(template, nodesToRemove) {
    const { element: { content }, parts } = template;
    const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
    let partIndex = nextActiveIndexInTemplateParts(parts);
    let part = parts[partIndex];
    let nodeIndex = -1;
    let removeCount = 0;
    const nodesToRemoveInTemplate = [];
    let currentRemovingNode = null;
    while (walker.nextNode()) {
        nodeIndex++;
        const node = walker.currentNode;
        // End removal if stepped past the removing node
        if (node.previousSibling === currentRemovingNode) {
            currentRemovingNode = null;
        }
        // A node to remove was found in the template
        if (nodesToRemove.has(node)) {
            nodesToRemoveInTemplate.push(node);
            // Track node we're removing
            if (currentRemovingNode === null) {
                currentRemovingNode = node;
            }
        }
        // When removing, increment count by which to adjust subsequent part indices
        if (currentRemovingNode !== null) {
            removeCount++;
        }
        while (part !== undefined && part.index === nodeIndex) {
            // If part is in a removed node deactivate it by setting index to -1 or
            // adjust the index as needed.
            part.index = currentRemovingNode !== null ? -1 : part.index - removeCount;
            // go to the next active part.
            partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
            part = parts[partIndex];
        }
    }
    nodesToRemoveInTemplate.forEach((n) => n.parentNode.removeChild(n));
}
const countNodes = (node) => {
    let count = (node.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */) ? 0 : 1;
    const walker = document.createTreeWalker(node, walkerNodeFilter, null, false);
    while (walker.nextNode()) {
        count++;
    }
    return count;
};
const nextActiveIndexInTemplateParts = (parts, startIndex = -1) => {
    for (let i = startIndex + 1; i < parts.length; i++) {
        const part = parts[i];
        if (isTemplatePartActive(part)) {
            return i;
        }
    }
    return -1;
};
/**
 * Inserts the given node into the Template, optionally before the given
 * refNode. In addition to inserting the node into the Template, the Template
 * part indices are updated to match the mutated Template DOM.
 */
function insertNodeIntoTemplate(template, node, refNode = null) {
    const { element: { content }, parts } = template;
    // If there's no refNode, then put node at end of template.
    // No part indices need to be shifted in this case.
    if (refNode === null || refNode === undefined) {
        content.appendChild(node);
        return;
    }
    const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
    let partIndex = nextActiveIndexInTemplateParts(parts);
    let insertCount = 0;
    let walkerIndex = -1;
    while (walker.nextNode()) {
        walkerIndex++;
        const walkerNode = walker.currentNode;
        if (walkerNode === refNode) {
            insertCount = countNodes(node);
            refNode.parentNode.insertBefore(node, refNode);
        }
        while (partIndex !== -1 && parts[partIndex].index === walkerIndex) {
            // If we've inserted the node, simply adjust all subsequent parts
            if (insertCount > 0) {
                while (partIndex !== -1) {
                    parts[partIndex].index += insertCount;
                    partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
                }
                return;
            }
            partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
        }
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const directives = new WeakMap();
/**
 * Brands a function as a directive factory function so that lit-html will call
 * the function during template rendering, rather than passing as a value.
 *
 * A _directive_ is a function that takes a Part as an argument. It has the
 * signature: `(part: Part) => void`.
 *
 * A directive _factory_ is a function that takes arguments for data and
 * configuration and returns a directive. Users of directive usually refer to
 * the directive factory as the directive. For example, "The repeat directive".
 *
 * Usually a template author will invoke a directive factory in their template
 * with relevant arguments, which will then return a directive function.
 *
 * Here's an example of using the `repeat()` directive factory that takes an
 * array and a function to render an item:
 *
 * ```js
 * html`<ul><${repeat(items, (item) => html`<li>${item}</li>`)}</ul>`
 * ```
 *
 * When `repeat` is invoked, it returns a directive function that closes over
 * `items` and the template function. When the outer template is rendered, the
 * return directive function is called with the Part for the expression.
 * `repeat` then performs it's custom logic to render multiple items.
 *
 * @param f The directive factory function. Must be a function that returns a
 * function of the signature `(part: Part) => void`. The returned function will
 * be called with the part object.
 *
 * @example
 *
 * import {directive, html} from 'lit-html';
 *
 * const immutable = directive((v) => (part) => {
 *   if (part.value !== v) {
 *     part.setValue(v)
 *   }
 * });
 */
const directive = (f) => ((...args) => {
    const d = f(...args);
    directives.set(d, true);
    return d;
});
const isDirective = (o) => {
    return typeof o === 'function' && directives.has(o);
};

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
const noChange = {};
/**
 * A sentinel value that signals a NodePart to fully clear its content.
 */
const nothing = {};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An instance of a `Template` that can be attached to the DOM and updated
 * with new values.
 */
class TemplateInstance {
    constructor(template, processor, options) {
        this.__parts = [];
        this.template = template;
        this.processor = processor;
        this.options = options;
    }
    update(values) {
        let i = 0;
        for (const part of this.__parts) {
            if (part !== undefined) {
                part.setValue(values[i]);
            }
            i++;
        }
        for (const part of this.__parts) {
            if (part !== undefined) {
                part.commit();
            }
        }
    }
    _clone() {
        // There are a number of steps in the lifecycle of a template instance's
        // DOM fragment:
        //  1. Clone - create the instance fragment
        //  2. Adopt - adopt into the main document
        //  3. Process - find part markers and create parts
        //  4. Upgrade - upgrade custom elements
        //  5. Update - set node, attribute, property, etc., values
        //  6. Connect - connect to the document. Optional and outside of this
        //     method.
        //
        // We have a few constraints on the ordering of these steps:
        //  * We need to upgrade before updating, so that property values will pass
        //    through any property setters.
        //  * We would like to process before upgrading so that we're sure that the
        //    cloned fragment is inert and not disturbed by self-modifying DOM.
        //  * We want custom elements to upgrade even in disconnected fragments.
        //
        // Given these constraints, with full custom elements support we would
        // prefer the order: Clone, Process, Adopt, Upgrade, Update, Connect
        //
        // But Safari does not implement CustomElementRegistry#upgrade, so we
        // can not implement that order and still have upgrade-before-update and
        // upgrade disconnected fragments. So we instead sacrifice the
        // process-before-upgrade constraint, since in Custom Elements v1 elements
        // must not modify their light DOM in the constructor. We still have issues
        // when co-existing with CEv0 elements like Polymer 1, and with polyfills
        // that don't strictly adhere to the no-modification rule because shadow
        // DOM, which may be created in the constructor, is emulated by being placed
        // in the light DOM.
        //
        // The resulting order is on native is: Clone, Adopt, Upgrade, Process,
        // Update, Connect. document.importNode() performs Clone, Adopt, and Upgrade
        // in one step.
        //
        // The Custom Elements v1 polyfill supports upgrade(), so the order when
        // polyfilled is the more ideal: Clone, Process, Adopt, Upgrade, Update,
        // Connect.
        const fragment = isCEPolyfill ?
            this.template.element.content.cloneNode(true) :
            document.importNode(this.template.element.content, true);
        const stack = [];
        const parts = this.template.parts;
        // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
        const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
        let partIndex = 0;
        let nodeIndex = 0;
        let part;
        let node = walker.nextNode();
        // Loop through all the nodes and parts of a template
        while (partIndex < parts.length) {
            part = parts[partIndex];
            if (!isTemplatePartActive(part)) {
                this.__parts.push(undefined);
                partIndex++;
                continue;
            }
            // Progress the tree walker until we find our next part's node.
            // Note that multiple parts may share the same node (attribute parts
            // on a single element), so this loop may not run at all.
            while (nodeIndex < part.index) {
                nodeIndex++;
                if (node.nodeName === 'TEMPLATE') {
                    stack.push(node);
                    walker.currentNode = node.content;
                }
                if ((node = walker.nextNode()) === null) {
                    // We've exhausted the content inside a nested template element.
                    // Because we still have parts (the outer for-loop), we know:
                    // - There is a template in the stack
                    // - The walker will find a nextNode outside the template
                    walker.currentNode = stack.pop();
                    node = walker.nextNode();
                }
            }
            // We've arrived at our part's node.
            if (part.type === 'node') {
                const part = this.processor.handleTextExpression(this.options);
                part.insertAfterNode(node.previousSibling);
                this.__parts.push(part);
            }
            else {
                this.__parts.push(...this.processor.handleAttributeExpressions(node, part.name, part.strings, this.options));
            }
            partIndex++;
        }
        if (isCEPolyfill) {
            document.adoptNode(fragment);
            customElements.upgrade(fragment);
        }
        return fragment;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Our TrustedTypePolicy for HTML which is declared using the html template
 * tag function.
 *
 * That HTML is a developer-authored constant, and is parsed with innerHTML
 * before any untrusted expressions have been mixed in. Therefor it is
 * considered safe by construction.
 */
const policy = window.trustedTypes &&
    trustedTypes.createPolicy('lit-html', { createHTML: (s) => s });
const commentMarker = ` ${marker} `;
/**
 * The return type of `html`, which holds a Template and the values from
 * interpolated expressions.
 */
class TemplateResult {
    constructor(strings, values, type, processor) {
        this.strings = strings;
        this.values = values;
        this.type = type;
        this.processor = processor;
    }
    /**
     * Returns a string of HTML used to create a `<template>` element.
     */
    getHTML() {
        const l = this.strings.length - 1;
        let html = '';
        let isCommentBinding = false;
        for (let i = 0; i < l; i++) {
            const s = this.strings[i];
            // For each binding we want to determine the kind of marker to insert
            // into the template source before it's parsed by the browser's HTML
            // parser. The marker type is based on whether the expression is in an
            // attribute, text, or comment position.
            //   * For node-position bindings we insert a comment with the marker
            //     sentinel as its text content, like <!--{{lit-guid}}-->.
            //   * For attribute bindings we insert just the marker sentinel for the
            //     first binding, so that we support unquoted attribute bindings.
            //     Subsequent bindings can use a comment marker because multi-binding
            //     attributes must be quoted.
            //   * For comment bindings we insert just the marker sentinel so we don't
            //     close the comment.
            //
            // The following code scans the template source, but is *not* an HTML
            // parser. We don't need to track the tree structure of the HTML, only
            // whether a binding is inside a comment, and if not, if it appears to be
            // the first binding in an attribute.
            const commentOpen = s.lastIndexOf('<!--');
            // We're in comment position if we have a comment open with no following
            // comment close. Because <-- can appear in an attribute value there can
            // be false positives.
            isCommentBinding = (commentOpen > -1 || isCommentBinding) &&
                s.indexOf('-->', commentOpen + 1) === -1;
            // Check to see if we have an attribute-like sequence preceding the
            // expression. This can match "name=value" like structures in text,
            // comments, and attribute values, so there can be false-positives.
            const attributeMatch = lastAttributeNameRegex.exec(s);
            if (attributeMatch === null) {
                // We're only in this branch if we don't have a attribute-like
                // preceding sequence. For comments, this guards against unusual
                // attribute values like <div foo="<!--${'bar'}">. Cases like
                // <!-- foo=${'bar'}--> are handled correctly in the attribute branch
                // below.
                html += s + (isCommentBinding ? commentMarker : nodeMarker);
            }
            else {
                // For attributes we use just a marker sentinel, and also append a
                // $lit$ suffix to the name to opt-out of attribute-specific parsing
                // that IE and Edge do for style and certain SVG attributes.
                html += s.substr(0, attributeMatch.index) + attributeMatch[1] +
                    attributeMatch[2] + boundAttributeSuffix + attributeMatch[3] +
                    marker;
            }
        }
        html += this.strings[l];
        return html;
    }
    getTemplateElement() {
        const template = document.createElement('template');
        let value = this.getHTML();
        if (policy !== undefined) {
            // this is secure because `this.strings` is a TemplateStringsArray.
            // TODO: validate this when
            // https://github.com/tc39/proposal-array-is-template-object is
            // implemented.
            value = policy.createHTML(value);
        }
        template.innerHTML = value;
        return template;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const isPrimitive = (value) => {
    return (value === null ||
        !(typeof value === 'object' || typeof value === 'function'));
};
const isIterable = (value) => {
    return Array.isArray(value) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !!(value && value[Symbol.iterator]);
};
/**
 * Writes attribute values to the DOM for a group of AttributeParts bound to a
 * single attribute. The value is only set once even if there are multiple parts
 * for an attribute.
 */
class AttributeCommitter {
    constructor(element, name, strings) {
        this.dirty = true;
        this.element = element;
        this.name = name;
        this.strings = strings;
        this.parts = [];
        for (let i = 0; i < strings.length - 1; i++) {
            this.parts[i] = this._createPart();
        }
    }
    /**
     * Creates a single part. Override this to create a differnt type of part.
     */
    _createPart() {
        return new AttributePart(this);
    }
    _getValue() {
        const strings = this.strings;
        const l = strings.length - 1;
        const parts = this.parts;
        // If we're assigning an attribute via syntax like:
        //    attr="${foo}"  or  attr=${foo}
        // but not
        //    attr="${foo} ${bar}" or attr="${foo} baz"
        // then we don't want to coerce the attribute value into one long
        // string. Instead we want to just return the value itself directly,
        // so that sanitizeDOMValue can get the actual value rather than
        // String(value)
        // The exception is if v is an array, in which case we do want to smash
        // it together into a string without calling String() on the array.
        //
        // This also allows trusted values (when using TrustedTypes) being
        // assigned to DOM sinks without being stringified in the process.
        if (l === 1 && strings[0] === '' && strings[1] === '') {
            const v = parts[0].value;
            if (typeof v === 'symbol') {
                return String(v);
            }
            if (typeof v === 'string' || !isIterable(v)) {
                return v;
            }
        }
        let text = '';
        for (let i = 0; i < l; i++) {
            text += strings[i];
            const part = parts[i];
            if (part !== undefined) {
                const v = part.value;
                if (isPrimitive(v) || !isIterable(v)) {
                    text += typeof v === 'string' ? v : String(v);
                }
                else {
                    for (const t of v) {
                        text += typeof t === 'string' ? t : String(t);
                    }
                }
            }
        }
        text += strings[l];
        return text;
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            this.element.setAttribute(this.name, this._getValue());
        }
    }
}
/**
 * A Part that controls all or part of an attribute value.
 */
class AttributePart {
    constructor(committer) {
        this.value = undefined;
        this.committer = committer;
    }
    setValue(value) {
        if (value !== noChange && (!isPrimitive(value) || value !== this.value)) {
            this.value = value;
            // If the value is a not a directive, dirty the committer so that it'll
            // call setAttribute. If the value is a directive, it'll dirty the
            // committer if it calls setValue().
            if (!isDirective(value)) {
                this.committer.dirty = true;
            }
        }
    }
    commit() {
        while (isDirective(this.value)) {
            const directive = this.value;
            this.value = noChange;
            directive(this);
        }
        if (this.value === noChange) {
            return;
        }
        this.committer.commit();
    }
}
/**
 * A Part that controls a location within a Node tree. Like a Range, NodePart
 * has start and end locations and can set and update the Nodes between those
 * locations.
 *
 * NodeParts support several value types: primitives, Nodes, TemplateResults,
 * as well as arrays and iterables of those types.
 */
class NodePart {
    constructor(options) {
        this.value = undefined;
        this.__pendingValue = undefined;
        this.options = options;
    }
    /**
     * Appends this part into a container.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendInto(container) {
        this.startNode = container.appendChild(createMarker());
        this.endNode = container.appendChild(createMarker());
    }
    /**
     * Inserts this part after the `ref` node (between `ref` and `ref`'s next
     * sibling). Both `ref` and its next sibling must be static, unchanging nodes
     * such as those that appear in a literal section of a template.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterNode(ref) {
        this.startNode = ref;
        this.endNode = ref.nextSibling;
    }
    /**
     * Appends this part into a parent part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendIntoPart(part) {
        part.__insert(this.startNode = createMarker());
        part.__insert(this.endNode = createMarker());
    }
    /**
     * Inserts this part after the `ref` part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterPart(ref) {
        ref.__insert(this.startNode = createMarker());
        this.endNode = ref.endNode;
        ref.endNode = this.startNode;
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        if (this.startNode.parentNode === null) {
            return;
        }
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        const value = this.__pendingValue;
        if (value === noChange) {
            return;
        }
        if (isPrimitive(value)) {
            if (value !== this.value) {
                this.__commitText(value);
            }
        }
        else if (value instanceof TemplateResult) {
            this.__commitTemplateResult(value);
        }
        else if (value instanceof Node) {
            this.__commitNode(value);
        }
        else if (isIterable(value)) {
            this.__commitIterable(value);
        }
        else if (value === nothing) {
            this.value = nothing;
            this.clear();
        }
        else {
            // Fallback, will render the string representation
            this.__commitText(value);
        }
    }
    __insert(node) {
        this.endNode.parentNode.insertBefore(node, this.endNode);
    }
    __commitNode(value) {
        if (this.value === value) {
            return;
        }
        this.clear();
        this.__insert(value);
        this.value = value;
    }
    __commitText(value) {
        const node = this.startNode.nextSibling;
        value = value == null ? '' : value;
        // If `value` isn't already a string, we explicitly convert it here in case
        // it can't be implicitly converted - i.e. it's a symbol.
        const valueAsString = typeof value === 'string' ? value : String(value);
        if (node === this.endNode.previousSibling &&
            node.nodeType === 3 /* Node.TEXT_NODE */) {
            // If we only have a single text node between the markers, we can just
            // set its value, rather than replacing it.
            // TODO(justinfagnani): Can we just check if this.value is primitive?
            node.data = valueAsString;
        }
        else {
            this.__commitNode(document.createTextNode(valueAsString));
        }
        this.value = value;
    }
    __commitTemplateResult(value) {
        const template = this.options.templateFactory(value);
        if (this.value instanceof TemplateInstance &&
            this.value.template === template) {
            this.value.update(value.values);
        }
        else {
            // Make sure we propagate the template processor from the TemplateResult
            // so that we use its syntax extension, etc. The template factory comes
            // from the render function options so that it can control template
            // caching and preprocessing.
            const instance = new TemplateInstance(template, value.processor, this.options);
            const fragment = instance._clone();
            instance.update(value.values);
            this.__commitNode(fragment);
            this.value = instance;
        }
    }
    __commitIterable(value) {
        // For an Iterable, we create a new InstancePart per item, then set its
        // value to the item. This is a little bit of overhead for every item in
        // an Iterable, but it lets us recurse easily and efficiently update Arrays
        // of TemplateResults that will be commonly returned from expressions like:
        // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
        // If _value is an array, then the previous render was of an
        // iterable and _value will contain the NodeParts from the previous
        // render. If _value is not an array, clear this part and make a new
        // array for NodeParts.
        if (!Array.isArray(this.value)) {
            this.value = [];
            this.clear();
        }
        // Lets us keep track of how many items we stamped so we can clear leftover
        // items from a previous render
        const itemParts = this.value;
        let partIndex = 0;
        let itemPart;
        for (const item of value) {
            // Try to reuse an existing part
            itemPart = itemParts[partIndex];
            // If no existing part, create a new one
            if (itemPart === undefined) {
                itemPart = new NodePart(this.options);
                itemParts.push(itemPart);
                if (partIndex === 0) {
                    itemPart.appendIntoPart(this);
                }
                else {
                    itemPart.insertAfterPart(itemParts[partIndex - 1]);
                }
            }
            itemPart.setValue(item);
            itemPart.commit();
            partIndex++;
        }
        if (partIndex < itemParts.length) {
            // Truncate the parts array so _value reflects the current state
            itemParts.length = partIndex;
            this.clear(itemPart && itemPart.endNode);
        }
    }
    clear(startNode = this.startNode) {
        removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
    }
}
/**
 * Implements a boolean attribute, roughly as defined in the HTML
 * specification.
 *
 * If the value is truthy, then the attribute is present with a value of
 * ''. If the value is falsey, the attribute is removed.
 */
class BooleanAttributePart {
    constructor(element, name, strings) {
        this.value = undefined;
        this.__pendingValue = undefined;
        if (strings.length !== 2 || strings[0] !== '' || strings[1] !== '') {
            throw new Error('Boolean attributes can only contain a single expression');
        }
        this.element = element;
        this.name = name;
        this.strings = strings;
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        if (this.__pendingValue === noChange) {
            return;
        }
        const value = !!this.__pendingValue;
        if (this.value !== value) {
            if (value) {
                this.element.setAttribute(this.name, '');
            }
            else {
                this.element.removeAttribute(this.name);
            }
            this.value = value;
        }
        this.__pendingValue = noChange;
    }
}
/**
 * Sets attribute values for PropertyParts, so that the value is only set once
 * even if there are multiple parts for a property.
 *
 * If an expression controls the whole property value, then the value is simply
 * assigned to the property under control. If there are string literals or
 * multiple expressions, then the strings are expressions are interpolated into
 * a string first.
 */
class PropertyCommitter extends AttributeCommitter {
    constructor(element, name, strings) {
        super(element, name, strings);
        this.single =
            (strings.length === 2 && strings[0] === '' && strings[1] === '');
    }
    _createPart() {
        return new PropertyPart(this);
    }
    _getValue() {
        if (this.single) {
            return this.parts[0].value;
        }
        return super._getValue();
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.element[this.name] = this._getValue();
        }
    }
}
class PropertyPart extends AttributePart {
}
// Detect event listener options support. If the `capture` property is read
// from the options object, then options are supported. If not, then the third
// argument to add/removeEventListener is interpreted as the boolean capture
// value so we should only pass the `capture` property.
let eventOptionsSupported = false;
// Wrap into an IIFE because MS Edge <= v41 does not support having try/catch
// blocks right into the body of a module
(() => {
    try {
        const options = {
            get capture() {
                eventOptionsSupported = true;
                return false;
            }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.addEventListener('test', options, options);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.removeEventListener('test', options, options);
    }
    catch (_e) {
        // event options not supported
    }
})();
class EventPart {
    constructor(element, eventName, eventContext) {
        this.value = undefined;
        this.__pendingValue = undefined;
        this.element = element;
        this.eventName = eventName;
        this.eventContext = eventContext;
        this.__boundHandleEvent = (e) => this.handleEvent(e);
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        if (this.__pendingValue === noChange) {
            return;
        }
        const newListener = this.__pendingValue;
        const oldListener = this.value;
        const shouldRemoveListener = newListener == null ||
            oldListener != null &&
                (newListener.capture !== oldListener.capture ||
                    newListener.once !== oldListener.once ||
                    newListener.passive !== oldListener.passive);
        const shouldAddListener = newListener != null && (oldListener == null || shouldRemoveListener);
        if (shouldRemoveListener) {
            this.element.removeEventListener(this.eventName, this.__boundHandleEvent, this.__options);
        }
        if (shouldAddListener) {
            this.__options = getOptions(newListener);
            this.element.addEventListener(this.eventName, this.__boundHandleEvent, this.__options);
        }
        this.value = newListener;
        this.__pendingValue = noChange;
    }
    handleEvent(event) {
        if (typeof this.value === 'function') {
            this.value.call(this.eventContext || this.element, event);
        }
        else {
            this.value.handleEvent(event);
        }
    }
}
// We copy options because of the inconsistent behavior of browsers when reading
// the third argument of add/removeEventListener. IE11 doesn't support options
// at all. Chrome 41 only reads `capture` if the argument is an object.
const getOptions = (o) => o &&
    (eventOptionsSupported ?
        { capture: o.capture, passive: o.passive, once: o.once } :
        o.capture);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * The default TemplateFactory which caches Templates keyed on
 * result.type and result.strings.
 */
function templateFactory(result) {
    let templateCache = templateCaches.get(result.type);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(result.type, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    // If the TemplateStringsArray is new, generate a key from the strings
    // This key is shared between all templates with identical content
    const key = result.strings.join(marker);
    // Check if we already have a Template for this key
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        // If we have not seen this key before, create a new Template
        template = new Template(result, result.getTemplateElement());
        // Cache the Template for this key
        templateCache.keyString.set(key, template);
    }
    // Cache all future queries for this TemplateStringsArray
    templateCache.stringsArray.set(result.strings, template);
    return template;
}
const templateCaches = new Map();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const parts = new WeakMap();
/**
 * Renders a template result or other value to a container.
 *
 * To update a container with new values, reevaluate the template literal and
 * call `render` with the new result.
 *
 * @param result Any value renderable by NodePart - typically a TemplateResult
 *     created by evaluating a template tag like `html` or `svg`.
 * @param container A DOM parent to render to. The entire contents are either
 *     replaced, or efficiently updated if the same result type was previous
 *     rendered there.
 * @param options RenderOptions for the entire render tree rendered to this
 *     container. Render options must *not* change between renders to the same
 *     container, as those changes will not effect previously rendered DOM.
 */
const render = (result, container, options) => {
    let part = parts.get(container);
    if (part === undefined) {
        removeNodes(container, container.firstChild);
        parts.set(container, part = new NodePart(Object.assign({ templateFactory }, options)));
        part.appendInto(container);
    }
    part.setValue(result);
    part.commit();
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Creates Parts when a template is instantiated.
 */
class DefaultTemplateProcessor {
    /**
     * Create parts for an attribute-position binding, given the event, attribute
     * name, and string literals.
     *
     * @param element The element containing the binding
     * @param name  The attribute name
     * @param strings The string literals. There are always at least two strings,
     *   event for fully-controlled bindings with a single expression.
     */
    handleAttributeExpressions(element, name, strings, options) {
        const prefix = name[0];
        if (prefix === '.') {
            const committer = new PropertyCommitter(element, name.slice(1), strings);
            return committer.parts;
        }
        if (prefix === '@') {
            return [new EventPart(element, name.slice(1), options.eventContext)];
        }
        if (prefix === '?') {
            return [new BooleanAttributePart(element, name.slice(1), strings)];
        }
        const committer = new AttributeCommitter(element, name, strings);
        return committer.parts;
    }
    /**
     * Create parts for a text-position binding.
     * @param templateFactory
     */
    handleTextExpression(options) {
        return new NodePart(options);
    }
}
const defaultTemplateProcessor = new DefaultTemplateProcessor();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
// TODO(justinfagnani): inject version number at build time
if (typeof window !== 'undefined') {
    (window['litHtmlVersions'] || (window['litHtmlVersions'] = [])).push('1.3.0');
}
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 */
const html = (strings, ...values) => new TemplateResult(strings, values, 'html', defaultTemplateProcessor);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// Get a key to lookup in `templateCaches`.
const getTemplateCacheKey = (type, scopeName) => `${type}--${scopeName}`;
let compatibleShadyCSSVersion = true;
if (typeof window.ShadyCSS === 'undefined') {
    compatibleShadyCSSVersion = false;
}
else if (typeof window.ShadyCSS.prepareTemplateDom === 'undefined') {
    console.warn(`Incompatible ShadyCSS version detected. ` +
        `Please update to at least @webcomponents/webcomponentsjs@2.0.2 and ` +
        `@webcomponents/shadycss@1.3.1.`);
    compatibleShadyCSSVersion = false;
}
/**
 * Template factory which scopes template DOM using ShadyCSS.
 * @param scopeName {string}
 */
const shadyTemplateFactory = (scopeName) => (result) => {
    const cacheKey = getTemplateCacheKey(result.type, scopeName);
    let templateCache = templateCaches.get(cacheKey);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(cacheKey, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    const key = result.strings.join(marker);
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        const element = result.getTemplateElement();
        if (compatibleShadyCSSVersion) {
            window.ShadyCSS.prepareTemplateDom(element, scopeName);
        }
        template = new Template(result, element);
        templateCache.keyString.set(key, template);
    }
    templateCache.stringsArray.set(result.strings, template);
    return template;
};
const TEMPLATE_TYPES = ['html', 'svg'];
/**
 * Removes all style elements from Templates for the given scopeName.
 */
const removeStylesFromLitTemplates = (scopeName) => {
    TEMPLATE_TYPES.forEach((type) => {
        const templates = templateCaches.get(getTemplateCacheKey(type, scopeName));
        if (templates !== undefined) {
            templates.keyString.forEach((template) => {
                const { element: { content } } = template;
                // IE 11 doesn't support the iterable param Set constructor
                const styles = new Set();
                Array.from(content.querySelectorAll('style')).forEach((s) => {
                    styles.add(s);
                });
                removeNodesFromTemplate(template, styles);
            });
        }
    });
};
const shadyRenderSet = new Set();
/**
 * For the given scope name, ensures that ShadyCSS style scoping is performed.
 * This is done just once per scope name so the fragment and template cannot
 * be modified.
 * (1) extracts styles from the rendered fragment and hands them to ShadyCSS
 * to be scoped and appended to the document
 * (2) removes style elements from all lit-html Templates for this scope name.
 *
 * Note, <style> elements can only be placed into templates for the
 * initial rendering of the scope. If <style> elements are included in templates
 * dynamically rendered to the scope (after the first scope render), they will
 * not be scoped and the <style> will be left in the template and rendered
 * output.
 */
const prepareTemplateStyles = (scopeName, renderedDOM, template) => {
    shadyRenderSet.add(scopeName);
    // If `renderedDOM` is stamped from a Template, then we need to edit that
    // Template's underlying template element. Otherwise, we create one here
    // to give to ShadyCSS, which still requires one while scoping.
    const templateElement = !!template ? template.element : document.createElement('template');
    // Move styles out of rendered DOM and store.
    const styles = renderedDOM.querySelectorAll('style');
    const { length } = styles;
    // If there are no styles, skip unnecessary work
    if (length === 0) {
        // Ensure prepareTemplateStyles is called to support adding
        // styles via `prepareAdoptedCssText` since that requires that
        // `prepareTemplateStyles` is called.
        //
        // ShadyCSS will only update styles containing @apply in the template
        // given to `prepareTemplateStyles`. If no lit Template was given,
        // ShadyCSS will not be able to update uses of @apply in any relevant
        // template. However, this is not a problem because we only create the
        // template for the purpose of supporting `prepareAdoptedCssText`,
        // which doesn't support @apply at all.
        window.ShadyCSS.prepareTemplateStyles(templateElement, scopeName);
        return;
    }
    const condensedStyle = document.createElement('style');
    // Collect styles into a single style. This helps us make sure ShadyCSS
    // manipulations will not prevent us from being able to fix up template
    // part indices.
    // NOTE: collecting styles is inefficient for browsers but ShadyCSS
    // currently does this anyway. When it does not, this should be changed.
    for (let i = 0; i < length; i++) {
        const style = styles[i];
        style.parentNode.removeChild(style);
        condensedStyle.textContent += style.textContent;
    }
    // Remove styles from nested templates in this scope.
    removeStylesFromLitTemplates(scopeName);
    // And then put the condensed style into the "root" template passed in as
    // `template`.
    const content = templateElement.content;
    if (!!template) {
        insertNodeIntoTemplate(template, condensedStyle, content.firstChild);
    }
    else {
        content.insertBefore(condensedStyle, content.firstChild);
    }
    // Note, it's important that ShadyCSS gets the template that `lit-html`
    // will actually render so that it can update the style inside when
    // needed (e.g. @apply native Shadow DOM case).
    window.ShadyCSS.prepareTemplateStyles(templateElement, scopeName);
    const style = content.querySelector('style');
    if (window.ShadyCSS.nativeShadow && style !== null) {
        // When in native Shadow DOM, ensure the style created by ShadyCSS is
        // included in initially rendered output (`renderedDOM`).
        renderedDOM.insertBefore(style.cloneNode(true), renderedDOM.firstChild);
    }
    else if (!!template) {
        // When no style is left in the template, parts will be broken as a
        // result. To fix this, we put back the style node ShadyCSS removed
        // and then tell lit to remove that node from the template.
        // There can be no style in the template in 2 cases (1) when Shady DOM
        // is in use, ShadyCSS removes all styles, (2) when native Shadow DOM
        // is in use ShadyCSS removes the style if it contains no content.
        // NOTE, ShadyCSS creates its own style so we can safely add/remove
        // `condensedStyle` here.
        content.insertBefore(condensedStyle, content.firstChild);
        const removes = new Set();
        removes.add(condensedStyle);
        removeNodesFromTemplate(template, removes);
    }
};
/**
 * Extension to the standard `render` method which supports rendering
 * to ShadowRoots when the ShadyDOM (https://github.com/webcomponents/shadydom)
 * and ShadyCSS (https://github.com/webcomponents/shadycss) polyfills are used
 * or when the webcomponentsjs
 * (https://github.com/webcomponents/webcomponentsjs) polyfill is used.
 *
 * Adds a `scopeName` option which is used to scope element DOM and stylesheets
 * when native ShadowDOM is unavailable. The `scopeName` will be added to
 * the class attribute of all rendered DOM. In addition, any style elements will
 * be automatically re-written with this `scopeName` selector and moved out
 * of the rendered DOM and into the document `<head>`.
 *
 * It is common to use this render method in conjunction with a custom element
 * which renders a shadowRoot. When this is done, typically the element's
 * `localName` should be used as the `scopeName`.
 *
 * In addition to DOM scoping, ShadyCSS also supports a basic shim for css
 * custom properties (needed only on older browsers like IE11) and a shim for
 * a deprecated feature called `@apply` that supports applying a set of css
 * custom properties to a given location.
 *
 * Usage considerations:
 *
 * * Part values in `<style>` elements are only applied the first time a given
 * `scopeName` renders. Subsequent changes to parts in style elements will have
 * no effect. Because of this, parts in style elements should only be used for
 * values that will never change, for example parts that set scope-wide theme
 * values or parts which render shared style elements.
 *
 * * Note, due to a limitation of the ShadyDOM polyfill, rendering in a
 * custom element's `constructor` is not supported. Instead rendering should
 * either done asynchronously, for example at microtask timing (for example
 * `Promise.resolve()`), or be deferred until the first time the element's
 * `connectedCallback` runs.
 *
 * Usage considerations when using shimmed custom properties or `@apply`:
 *
 * * Whenever any dynamic changes are made which affect
 * css custom properties, `ShadyCSS.styleElement(element)` must be called
 * to update the element. There are two cases when this is needed:
 * (1) the element is connected to a new parent, (2) a class is added to the
 * element that causes it to match different custom properties.
 * To address the first case when rendering a custom element, `styleElement`
 * should be called in the element's `connectedCallback`.
 *
 * * Shimmed custom properties may only be defined either for an entire
 * shadowRoot (for example, in a `:host` rule) or via a rule that directly
 * matches an element with a shadowRoot. In other words, instead of flowing from
 * parent to child as do native css custom properties, shimmed custom properties
 * flow only from shadowRoots to nested shadowRoots.
 *
 * * When using `@apply` mixing css shorthand property names with
 * non-shorthand names (for example `border` and `border-width`) is not
 * supported.
 */
const render$1 = (result, container, options) => {
    if (!options || typeof options !== 'object' || !options.scopeName) {
        throw new Error('The `scopeName` option is required.');
    }
    const scopeName = options.scopeName;
    const hasRendered = parts.has(container);
    const needsScoping = compatibleShadyCSSVersion &&
        container.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */ &&
        !!container.host;
    // Handle first render to a scope specially...
    const firstScopeRender = needsScoping && !shadyRenderSet.has(scopeName);
    // On first scope render, render into a fragment; this cannot be a single
    // fragment that is reused since nested renders can occur synchronously.
    const renderContainer = firstScopeRender ? document.createDocumentFragment() : container;
    render(result, renderContainer, Object.assign({ templateFactory: shadyTemplateFactory(scopeName) }, options));
    // When performing first scope render,
    // (1) We've rendered into a fragment so that there's a chance to
    // `prepareTemplateStyles` before sub-elements hit the DOM
    // (which might cause them to render based on a common pattern of
    // rendering in a custom element's `connectedCallback`);
    // (2) Scope the template with ShadyCSS one time only for this scope.
    // (3) Render the fragment into the container and make sure the
    // container knows its `part` is the one we just rendered. This ensures
    // DOM will be re-used on subsequent renders.
    if (firstScopeRender) {
        const part = parts.get(renderContainer);
        parts.delete(renderContainer);
        // ShadyCSS might have style sheets (e.g. from `prepareAdoptedCssText`)
        // that should apply to `renderContainer` even if the rendered value is
        // not a TemplateInstance. However, it will only insert scoped styles
        // into the document if `prepareTemplateStyles` has already been called
        // for the given scope name.
        const template = part.value instanceof TemplateInstance ?
            part.value.template :
            undefined;
        prepareTemplateStyles(scopeName, renderContainer, template);
        removeNodes(container, container.firstChild);
        container.appendChild(renderContainer);
        parts.set(container, part);
    }
    // After elements have hit the DOM, update styling if this is the
    // initial render to this container.
    // This is needed whenever dynamic changes are made so it would be
    // safest to do every render; however, this would regress performance
    // so we leave it up to the user to call `ShadyCSS.styleElement`
    // for dynamic changes.
    if (!hasRendered && needsScoping) {
        window.ShadyCSS.styleElement(container.host);
    }
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
var _a;
/**
 * Use this module if you want to create your own base class extending
 * [[UpdatingElement]].
 * @packageDocumentation
 */
/*
 * When using Closure Compiler, JSCompiler_renameProperty(property, object) is
 * replaced at compile time by the munged name for object[property]. We cannot
 * alias this function, so we have to use a small shim that has the same
 * behavior when not compiling.
 */
window.JSCompiler_renameProperty =
    (prop, _obj) => prop;
const defaultConverter = {
    toAttribute(value, type) {
        switch (type) {
            case Boolean:
                return value ? '' : null;
            case Object:
            case Array:
                // if the value is `null` or `undefined` pass this through
                // to allow removing/no change behavior.
                return value == null ? value : JSON.stringify(value);
        }
        return value;
    },
    fromAttribute(value, type) {
        switch (type) {
            case Boolean:
                return value !== null;
            case Number:
                return value === null ? null : Number(value);
            case Object:
            case Array:
                return JSON.parse(value);
        }
        return value;
    }
};
/**
 * Change function that returns true if `value` is different from `oldValue`.
 * This method is used as the default for a property's `hasChanged` function.
 */
const notEqual = (value, old) => {
    // This ensures (old==NaN, value==NaN) always returns false
    return old !== value && (old === old || value === value);
};
const defaultPropertyDeclaration = {
    attribute: true,
    type: String,
    converter: defaultConverter,
    reflect: false,
    hasChanged: notEqual
};
const STATE_HAS_UPDATED = 1;
const STATE_UPDATE_REQUESTED = 1 << 2;
const STATE_IS_REFLECTING_TO_ATTRIBUTE = 1 << 3;
const STATE_IS_REFLECTING_TO_PROPERTY = 1 << 4;
/**
 * The Closure JS Compiler doesn't currently have good support for static
 * property semantics where "this" is dynamic (e.g.
 * https://github.com/google/closure-compiler/issues/3177 and others) so we use
 * this hack to bypass any rewriting by the compiler.
 */
const finalized = 'finalized';
/**
 * Base element class which manages element properties and attributes. When
 * properties change, the `update` method is asynchronously called. This method
 * should be supplied by subclassers to render updates as desired.
 * @noInheritDoc
 */
class UpdatingElement extends HTMLElement {
    constructor() {
        super();
        this.initialize();
    }
    /**
     * Returns a list of attributes corresponding to the registered properties.
     * @nocollapse
     */
    static get observedAttributes() {
        // note: piggy backing on this to ensure we're finalized.
        this.finalize();
        const attributes = [];
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        this._classProperties.forEach((v, p) => {
            const attr = this._attributeNameForProperty(p, v);
            if (attr !== undefined) {
                this._attributeToPropertyMap.set(attr, p);
                attributes.push(attr);
            }
        });
        return attributes;
    }
    /**
     * Ensures the private `_classProperties` property metadata is created.
     * In addition to `finalize` this is also called in `createProperty` to
     * ensure the `@property` decorator can add property metadata.
     */
    /** @nocollapse */
    static _ensureClassProperties() {
        // ensure private storage for property declarations.
        if (!this.hasOwnProperty(JSCompiler_renameProperty('_classProperties', this))) {
            this._classProperties = new Map();
            // NOTE: Workaround IE11 not supporting Map constructor argument.
            const superProperties = Object.getPrototypeOf(this)._classProperties;
            if (superProperties !== undefined) {
                superProperties.forEach((v, k) => this._classProperties.set(k, v));
            }
        }
    }
    /**
     * Creates a property accessor on the element prototype if one does not exist
     * and stores a PropertyDeclaration for the property with the given options.
     * The property setter calls the property's `hasChanged` property option
     * or uses a strict identity check to determine whether or not to request
     * an update.
     *
     * This method may be overridden to customize properties; however,
     * when doing so, it's important to call `super.createProperty` to ensure
     * the property is setup correctly. This method calls
     * `getPropertyDescriptor` internally to get a descriptor to install.
     * To customize what properties do when they are get or set, override
     * `getPropertyDescriptor`. To customize the options for a property,
     * implement `createProperty` like this:
     *
     * static createProperty(name, options) {
     *   options = Object.assign(options, {myOption: true});
     *   super.createProperty(name, options);
     * }
     *
     * @nocollapse
     */
    static createProperty(name, options = defaultPropertyDeclaration) {
        // Note, since this can be called by the `@property` decorator which
        // is called before `finalize`, we ensure storage exists for property
        // metadata.
        this._ensureClassProperties();
        this._classProperties.set(name, options);
        // Do not generate an accessor if the prototype already has one, since
        // it would be lost otherwise and that would never be the user's intention;
        // Instead, we expect users to call `requestUpdate` themselves from
        // user-defined accessors. Note that if the super has an accessor we will
        // still overwrite it
        if (options.noAccessor || this.prototype.hasOwnProperty(name)) {
            return;
        }
        const key = typeof name === 'symbol' ? Symbol() : `__${name}`;
        const descriptor = this.getPropertyDescriptor(name, key, options);
        if (descriptor !== undefined) {
            Object.defineProperty(this.prototype, name, descriptor);
        }
    }
    /**
     * Returns a property descriptor to be defined on the given named property.
     * If no descriptor is returned, the property will not become an accessor.
     * For example,
     *
     *   class MyElement extends LitElement {
     *     static getPropertyDescriptor(name, key, options) {
     *       const defaultDescriptor =
     *           super.getPropertyDescriptor(name, key, options);
     *       const setter = defaultDescriptor.set;
     *       return {
     *         get: defaultDescriptor.get,
     *         set(value) {
     *           setter.call(this, value);
     *           // custom action.
     *         },
     *         configurable: true,
     *         enumerable: true
     *       }
     *     }
     *   }
     *
     * @nocollapse
     */
    static getPropertyDescriptor(name, key, options) {
        return {
            // tslint:disable-next-line:no-any no symbol in index
            get() {
                return this[key];
            },
            set(value) {
                const oldValue = this[name];
                this[key] = value;
                this
                    .requestUpdateInternal(name, oldValue, options);
            },
            configurable: true,
            enumerable: true
        };
    }
    /**
     * Returns the property options associated with the given property.
     * These options are defined with a PropertyDeclaration via the `properties`
     * object or the `@property` decorator and are registered in
     * `createProperty(...)`.
     *
     * Note, this method should be considered "final" and not overridden. To
     * customize the options for a given property, override `createProperty`.
     *
     * @nocollapse
     * @final
     */
    static getPropertyOptions(name) {
        return this._classProperties && this._classProperties.get(name) ||
            defaultPropertyDeclaration;
    }
    /**
     * Creates property accessors for registered properties and ensures
     * any superclasses are also finalized.
     * @nocollapse
     */
    static finalize() {
        // finalize any superclasses
        const superCtor = Object.getPrototypeOf(this);
        if (!superCtor.hasOwnProperty(finalized)) {
            superCtor.finalize();
        }
        this[finalized] = true;
        this._ensureClassProperties();
        // initialize Map populated in observedAttributes
        this._attributeToPropertyMap = new Map();
        // make any properties
        // Note, only process "own" properties since this element will inherit
        // any properties defined on the superClass, and finalization ensures
        // the entire prototype chain is finalized.
        if (this.hasOwnProperty(JSCompiler_renameProperty('properties', this))) {
            const props = this.properties;
            // support symbols in properties (IE11 does not support this)
            const propKeys = [
                ...Object.getOwnPropertyNames(props),
                ...(typeof Object.getOwnPropertySymbols === 'function') ?
                    Object.getOwnPropertySymbols(props) :
                    []
            ];
            // This for/of is ok because propKeys is an array
            for (const p of propKeys) {
                // note, use of `any` is due to TypeSript lack of support for symbol in
                // index types
                // tslint:disable-next-line:no-any no symbol in index
                this.createProperty(p, props[p]);
            }
        }
    }
    /**
     * Returns the property name for the given attribute `name`.
     * @nocollapse
     */
    static _attributeNameForProperty(name, options) {
        const attribute = options.attribute;
        return attribute === false ?
            undefined :
            (typeof attribute === 'string' ?
                attribute :
                (typeof name === 'string' ? name.toLowerCase() : undefined));
    }
    /**
     * Returns true if a property should request an update.
     * Called when a property value is set and uses the `hasChanged`
     * option for the property if present or a strict identity check.
     * @nocollapse
     */
    static _valueHasChanged(value, old, hasChanged = notEqual) {
        return hasChanged(value, old);
    }
    /**
     * Returns the property value for the given attribute value.
     * Called via the `attributeChangedCallback` and uses the property's
     * `converter` or `converter.fromAttribute` property option.
     * @nocollapse
     */
    static _propertyValueFromAttribute(value, options) {
        const type = options.type;
        const converter = options.converter || defaultConverter;
        const fromAttribute = (typeof converter === 'function' ? converter : converter.fromAttribute);
        return fromAttribute ? fromAttribute(value, type) : value;
    }
    /**
     * Returns the attribute value for the given property value. If this
     * returns undefined, the property will *not* be reflected to an attribute.
     * If this returns null, the attribute will be removed, otherwise the
     * attribute will be set to the value.
     * This uses the property's `reflect` and `type.toAttribute` property options.
     * @nocollapse
     */
    static _propertyValueToAttribute(value, options) {
        if (options.reflect === undefined) {
            return;
        }
        const type = options.type;
        const converter = options.converter;
        const toAttribute = converter && converter.toAttribute ||
            defaultConverter.toAttribute;
        return toAttribute(value, type);
    }
    /**
     * Performs element initialization. By default captures any pre-set values for
     * registered properties.
     */
    initialize() {
        this._updateState = 0;
        this._updatePromise =
            new Promise((res) => this._enableUpdatingResolver = res);
        this._changedProperties = new Map();
        this._saveInstanceProperties();
        // ensures first update will be caught by an early access of
        // `updateComplete`
        this.requestUpdateInternal();
    }
    /**
     * Fixes any properties set on the instance before upgrade time.
     * Otherwise these would shadow the accessor and break these properties.
     * The properties are stored in a Map which is played back after the
     * constructor runs. Note, on very old versions of Safari (<=9) or Chrome
     * (<=41), properties created for native platform properties like (`id` or
     * `name`) may not have default values set in the element constructor. On
     * these browsers native properties appear on instances and therefore their
     * default value will overwrite any element default (e.g. if the element sets
     * this.id = 'id' in the constructor, the 'id' will become '' since this is
     * the native platform default).
     */
    _saveInstanceProperties() {
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        this.constructor
            ._classProperties.forEach((_v, p) => {
            if (this.hasOwnProperty(p)) {
                const value = this[p];
                delete this[p];
                if (!this._instanceProperties) {
                    this._instanceProperties = new Map();
                }
                this._instanceProperties.set(p, value);
            }
        });
    }
    /**
     * Applies previously saved instance properties.
     */
    _applyInstanceProperties() {
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        // tslint:disable-next-line:no-any
        this._instanceProperties.forEach((v, p) => this[p] = v);
        this._instanceProperties = undefined;
    }
    connectedCallback() {
        // Ensure first connection completes an update. Updates cannot complete
        // before connection.
        this.enableUpdating();
    }
    enableUpdating() {
        if (this._enableUpdatingResolver !== undefined) {
            this._enableUpdatingResolver();
            this._enableUpdatingResolver = undefined;
        }
    }
    /**
     * Allows for `super.disconnectedCallback()` in extensions while
     * reserving the possibility of making non-breaking feature additions
     * when disconnecting at some point in the future.
     */
    disconnectedCallback() {
    }
    /**
     * Synchronizes property values when attributes change.
     */
    attributeChangedCallback(name, old, value) {
        if (old !== value) {
            this._attributeToProperty(name, value);
        }
    }
    _propertyToAttribute(name, value, options = defaultPropertyDeclaration) {
        const ctor = this.constructor;
        const attr = ctor._attributeNameForProperty(name, options);
        if (attr !== undefined) {
            const attrValue = ctor._propertyValueToAttribute(value, options);
            // an undefined value does not change the attribute.
            if (attrValue === undefined) {
                return;
            }
            // Track if the property is being reflected to avoid
            // setting the property again via `attributeChangedCallback`. Note:
            // 1. this takes advantage of the fact that the callback is synchronous.
            // 2. will behave incorrectly if multiple attributes are in the reaction
            // stack at time of calling. However, since we process attributes
            // in `update` this should not be possible (or an extreme corner case
            // that we'd like to discover).
            // mark state reflecting
            this._updateState = this._updateState | STATE_IS_REFLECTING_TO_ATTRIBUTE;
            if (attrValue == null) {
                this.removeAttribute(attr);
            }
            else {
                this.setAttribute(attr, attrValue);
            }
            // mark state not reflecting
            this._updateState = this._updateState & ~STATE_IS_REFLECTING_TO_ATTRIBUTE;
        }
    }
    _attributeToProperty(name, value) {
        // Use tracking info to avoid deserializing attribute value if it was
        // just set from a property setter.
        if (this._updateState & STATE_IS_REFLECTING_TO_ATTRIBUTE) {
            return;
        }
        const ctor = this.constructor;
        // Note, hint this as an `AttributeMap` so closure clearly understands
        // the type; it has issues with tracking types through statics
        // tslint:disable-next-line:no-unnecessary-type-assertion
        const propName = ctor._attributeToPropertyMap.get(name);
        if (propName !== undefined) {
            const options = ctor.getPropertyOptions(propName);
            // mark state reflecting
            this._updateState = this._updateState | STATE_IS_REFLECTING_TO_PROPERTY;
            this[propName] =
                // tslint:disable-next-line:no-any
                ctor._propertyValueFromAttribute(value, options);
            // mark state not reflecting
            this._updateState = this._updateState & ~STATE_IS_REFLECTING_TO_PROPERTY;
        }
    }
    /**
     * This protected version of `requestUpdate` does not access or return the
     * `updateComplete` promise. This promise can be overridden and is therefore
     * not free to access.
     */
    requestUpdateInternal(name, oldValue, options) {
        let shouldRequestUpdate = true;
        // If we have a property key, perform property update steps.
        if (name !== undefined) {
            const ctor = this.constructor;
            options = options || ctor.getPropertyOptions(name);
            if (ctor._valueHasChanged(this[name], oldValue, options.hasChanged)) {
                if (!this._changedProperties.has(name)) {
                    this._changedProperties.set(name, oldValue);
                }
                // Add to reflecting properties set.
                // Note, it's important that every change has a chance to add the
                // property to `_reflectingProperties`. This ensures setting
                // attribute + property reflects correctly.
                if (options.reflect === true &&
                    !(this._updateState & STATE_IS_REFLECTING_TO_PROPERTY)) {
                    if (this._reflectingProperties === undefined) {
                        this._reflectingProperties = new Map();
                    }
                    this._reflectingProperties.set(name, options);
                }
            }
            else {
                // Abort the request if the property should not be considered changed.
                shouldRequestUpdate = false;
            }
        }
        if (!this._hasRequestedUpdate && shouldRequestUpdate) {
            this._updatePromise = this._enqueueUpdate();
        }
    }
    /**
     * Requests an update which is processed asynchronously. This should
     * be called when an element should update based on some state not triggered
     * by setting a property. In this case, pass no arguments. It should also be
     * called when manually implementing a property setter. In this case, pass the
     * property `name` and `oldValue` to ensure that any configured property
     * options are honored. Returns the `updateComplete` Promise which is resolved
     * when the update completes.
     *
     * @param name {PropertyKey} (optional) name of requesting property
     * @param oldValue {any} (optional) old value of requesting property
     * @returns {Promise} A Promise that is resolved when the update completes.
     */
    requestUpdate(name, oldValue) {
        this.requestUpdateInternal(name, oldValue);
        return this.updateComplete;
    }
    /**
     * Sets up the element to asynchronously update.
     */
    async _enqueueUpdate() {
        this._updateState = this._updateState | STATE_UPDATE_REQUESTED;
        try {
            // Ensure any previous update has resolved before updating.
            // This `await` also ensures that property changes are batched.
            await this._updatePromise;
        }
        catch (e) {
            // Ignore any previous errors. We only care that the previous cycle is
            // done. Any error should have been handled in the previous update.
        }
        const result = this.performUpdate();
        // If `performUpdate` returns a Promise, we await it. This is done to
        // enable coordinating updates with a scheduler. Note, the result is
        // checked to avoid delaying an additional microtask unless we need to.
        if (result != null) {
            await result;
        }
        return !this._hasRequestedUpdate;
    }
    get _hasRequestedUpdate() {
        return (this._updateState & STATE_UPDATE_REQUESTED);
    }
    get hasUpdated() {
        return (this._updateState & STATE_HAS_UPDATED);
    }
    /**
     * Performs an element update. Note, if an exception is thrown during the
     * update, `firstUpdated` and `updated` will not be called.
     *
     * You can override this method to change the timing of updates. If this
     * method is overridden, `super.performUpdate()` must be called.
     *
     * For instance, to schedule updates to occur just before the next frame:
     *
     * ```
     * protected async performUpdate(): Promise<unknown> {
     *   await new Promise((resolve) => requestAnimationFrame(() => resolve()));
     *   super.performUpdate();
     * }
     * ```
     */
    performUpdate() {
        // Abort any update if one is not pending when this is called.
        // This can happen if `performUpdate` is called early to "flush"
        // the update.
        if (!this._hasRequestedUpdate) {
            return;
        }
        // Mixin instance properties once, if they exist.
        if (this._instanceProperties) {
            this._applyInstanceProperties();
        }
        let shouldUpdate = false;
        const changedProperties = this._changedProperties;
        try {
            shouldUpdate = this.shouldUpdate(changedProperties);
            if (shouldUpdate) {
                this.update(changedProperties);
            }
            else {
                this._markUpdated();
            }
        }
        catch (e) {
            // Prevent `firstUpdated` and `updated` from running when there's an
            // update exception.
            shouldUpdate = false;
            // Ensure element can accept additional updates after an exception.
            this._markUpdated();
            throw e;
        }
        if (shouldUpdate) {
            if (!(this._updateState & STATE_HAS_UPDATED)) {
                this._updateState = this._updateState | STATE_HAS_UPDATED;
                this.firstUpdated(changedProperties);
            }
            this.updated(changedProperties);
        }
    }
    _markUpdated() {
        this._changedProperties = new Map();
        this._updateState = this._updateState & ~STATE_UPDATE_REQUESTED;
    }
    /**
     * Returns a Promise that resolves when the element has completed updating.
     * The Promise value is a boolean that is `true` if the element completed the
     * update without triggering another update. The Promise result is `false` if
     * a property was set inside `updated()`. If the Promise is rejected, an
     * exception was thrown during the update.
     *
     * To await additional asynchronous work, override the `_getUpdateComplete`
     * method. For example, it is sometimes useful to await a rendered element
     * before fulfilling this Promise. To do this, first await
     * `super._getUpdateComplete()`, then any subsequent state.
     *
     * @returns {Promise} The Promise returns a boolean that indicates if the
     * update resolved without triggering another update.
     */
    get updateComplete() {
        return this._getUpdateComplete();
    }
    /**
     * Override point for the `updateComplete` promise.
     *
     * It is not safe to override the `updateComplete` getter directly due to a
     * limitation in TypeScript which means it is not possible to call a
     * superclass getter (e.g. `super.updateComplete.then(...)`) when the target
     * language is ES5 (https://github.com/microsoft/TypeScript/issues/338).
     * This method should be overridden instead. For example:
     *
     *   class MyElement extends LitElement {
     *     async _getUpdateComplete() {
     *       await super._getUpdateComplete();
     *       await this._myChild.updateComplete;
     *     }
     *   }
     */
    _getUpdateComplete() {
        return this._updatePromise;
    }
    /**
     * Controls whether or not `update` should be called when the element requests
     * an update. By default, this method always returns `true`, but this can be
     * customized to control when to update.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    shouldUpdate(_changedProperties) {
        return true;
    }
    /**
     * Updates the element. This method reflects property values to attributes.
     * It can be overridden to render and keep updated element DOM.
     * Setting properties inside this method will *not* trigger
     * another update.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    update(_changedProperties) {
        if (this._reflectingProperties !== undefined &&
            this._reflectingProperties.size > 0) {
            // Use forEach so this works even if for/of loops are compiled to for
            // loops expecting arrays
            this._reflectingProperties.forEach((v, k) => this._propertyToAttribute(k, this[k], v));
            this._reflectingProperties = undefined;
        }
        this._markUpdated();
    }
    /**
     * Invoked whenever the element is updated. Implement to perform
     * post-updating tasks via DOM APIs, for example, focusing an element.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    updated(_changedProperties) {
    }
    /**
     * Invoked when the element is first updated. Implement to perform one time
     * work on the element after update.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    firstUpdated(_changedProperties) {
    }
}
_a = finalized;
/**
 * Marks class as having finished creating properties.
 */
UpdatingElement[_a] = true;

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const standardProperty = (options, element) => {
    // When decorating an accessor, pass it through and add property metadata.
    // Note, the `hasOwnProperty` check in `createProperty` ensures we don't
    // stomp over the user's accessor.
    if (element.kind === 'method' && element.descriptor &&
        !('value' in element.descriptor)) {
        return Object.assign(Object.assign({}, element), { finisher(clazz) {
                clazz.createProperty(element.key, options);
            } });
    }
    else {
        // createProperty() takes care of defining the property, but we still
        // must return some kind of descriptor, so return a descriptor for an
        // unused prototype field. The finisher calls createProperty().
        return {
            kind: 'field',
            key: Symbol(),
            placement: 'own',
            descriptor: {},
            // When @babel/plugin-proposal-decorators implements initializers,
            // do this instead of the initializer below. See:
            // https://github.com/babel/babel/issues/9260 extras: [
            //   {
            //     kind: 'initializer',
            //     placement: 'own',
            //     initializer: descriptor.initializer,
            //   }
            // ],
            initializer() {
                if (typeof element.initializer === 'function') {
                    this[element.key] = element.initializer.call(this);
                }
            },
            finisher(clazz) {
                clazz.createProperty(element.key, options);
            }
        };
    }
};
const legacyProperty = (options, proto, name) => {
    proto.constructor
        .createProperty(name, options);
};
/**
 * A property decorator which creates a LitElement property which reflects a
 * corresponding attribute value. A [[`PropertyDeclaration`]] may optionally be
 * supplied to configure property features.
 *
 * This decorator should only be used for public fields. Private or protected
 * fields should use the [[`internalProperty`]] decorator.
 *
 * @example
 * ```ts
 * class MyElement {
 *   @property({ type: Boolean })
 *   clicked = false;
 * }
 * ```
 * @category Decorator
 * @ExportDecoratedItems
 */
function property(options) {
    // tslint:disable-next-line:no-any decorator
    return (protoOrDescriptor, name) => (name !== undefined) ?
        legacyProperty(options, protoOrDescriptor, name) :
        standardProperty(options, protoOrDescriptor);
}
/**
 * A property decorator that converts a class property into a getter that
 * executes a querySelector on the element's renderRoot.
 *
 * @param selector A DOMString containing one or more selectors to match.
 * @param cache An optional boolean which when true performs the DOM query only
 * once and caches the result.
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector
 *
 * @example
 *
 * ```ts
 * class MyElement {
 *   @query('#first')
 *   first;
 *
 *   render() {
 *     return html`
 *       <div id="first"></div>
 *       <div id="second"></div>
 *     `;
 *   }
 * }
 * ```
 * @category Decorator
 */
function query(selector, cache) {
    return (protoOrDescriptor, 
    // tslint:disable-next-line:no-any decorator
    name) => {
        const descriptor = {
            get() {
                return this.renderRoot.querySelector(selector);
            },
            enumerable: true,
            configurable: true,
        };
        if (cache) {
            const key = typeof name === 'symbol' ? Symbol() : `__${name}`;
            descriptor.get = function () {
                if (this[key] === undefined) {
                    (this[key] =
                        this.renderRoot.querySelector(selector));
                }
                return this[key];
            };
        }
        return (name !== undefined) ?
            legacyQuery(descriptor, protoOrDescriptor, name) :
            standardQuery(descriptor, protoOrDescriptor);
    };
}
const legacyQuery = (descriptor, proto, name) => {
    Object.defineProperty(proto, name, descriptor);
};
const standardQuery = (descriptor, element) => ({
    kind: 'method',
    placement: 'prototype',
    key: element.key,
    descriptor,
});
// x-browser support for matches
// tslint:disable-next-line:no-any
const ElementProto = Element.prototype;
const legacyMatches = ElementProto.msMatchesSelector || ElementProto.webkitMatchesSelector;
/**
 * A property decorator that converts a class property into a getter that
 * returns the `assignedNodes` of the given named `slot`. Note, the type of
 * this property should be annotated as `NodeListOf<HTMLElement>`.
 *
 * @param slotName A string name of the slot.
 * @param flatten A boolean which when true flattens the assigned nodes,
 * meaning any assigned nodes that are slot elements are replaced with their
 * assigned nodes.
 * @param selector A string which filters the results to elements that match
 * the given css selector.
 *
 * * @example
 * ```ts
 * class MyElement {
 *   @queryAssignedNodes('list', true, '.item')
 *   listItems;
 *
 *   render() {
 *     return html`
 *       <slot name="list"></slot>
 *     `;
 *   }
 * }
 * ```
 * @category Decorator
 */
function queryAssignedNodes(slotName = '', flatten = false, selector = '') {
    return (protoOrDescriptor, 
    // tslint:disable-next-line:no-any decorator
    name) => {
        const descriptor = {
            get() {
                const slotSelector = `slot${slotName ? `[name=${slotName}]` : ':not([name])'}`;
                const slot = this.renderRoot.querySelector(slotSelector);
                let nodes = slot && slot.assignedNodes({ flatten });
                if (nodes && selector) {
                    nodes = nodes.filter((node) => node.nodeType === Node.ELEMENT_NODE &&
                        node.matches ?
                        node.matches(selector) :
                        legacyMatches.call(node, selector));
                }
                return nodes;
            },
            enumerable: true,
            configurable: true,
        };
        return (name !== undefined) ?
            legacyQuery(descriptor, protoOrDescriptor, name) :
            standardQuery(descriptor, protoOrDescriptor);
    };
}

/**
@license
Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/
/**
 * Whether the current browser supports `adoptedStyleSheets`.
 */
const supportsAdoptingStyleSheets = (window.ShadowRoot) &&
    (window.ShadyCSS === undefined || window.ShadyCSS.nativeShadow) &&
    ('adoptedStyleSheets' in Document.prototype) &&
    ('replace' in CSSStyleSheet.prototype);
const constructionToken = Symbol();
class CSSResult {
    constructor(cssText, safeToken) {
        if (safeToken !== constructionToken) {
            throw new Error('CSSResult is not constructable. Use `unsafeCSS` or `css` instead.');
        }
        this.cssText = cssText;
    }
    // Note, this is a getter so that it's lazy. In practice, this means
    // stylesheets are not created until the first element instance is made.
    get styleSheet() {
        if (this._styleSheet === undefined) {
            // Note, if `supportsAdoptingStyleSheets` is true then we assume
            // CSSStyleSheet is constructable.
            if (supportsAdoptingStyleSheets) {
                this._styleSheet = new CSSStyleSheet();
                this._styleSheet.replaceSync(this.cssText);
            }
            else {
                this._styleSheet = null;
            }
        }
        return this._styleSheet;
    }
    toString() {
        return this.cssText;
    }
}
/**
 * Wrap a value for interpolation in a [[`css`]] tagged template literal.
 *
 * This is unsafe because untrusted CSS text can be used to phone home
 * or exfiltrate data to an attacker controlled site. Take care to only use
 * this with trusted input.
 */
const unsafeCSS = (value) => {
    return new CSSResult(String(value), constructionToken);
};
const textFromCSSResult = (value) => {
    if (value instanceof CSSResult) {
        return value.cssText;
    }
    else if (typeof value === 'number') {
        return value;
    }
    else {
        throw new Error(`Value passed to 'css' function must be a 'css' function result: ${value}. Use 'unsafeCSS' to pass non-literal values, but
            take care to ensure page security.`);
    }
};
/**
 * Template tag which which can be used with LitElement's [[LitElement.styles |
 * `styles`]] property to set element styles. For security reasons, only literal
 * string values may be used. To incorporate non-literal values [[`unsafeCSS`]]
 * may be used inside a template string part.
 */
const css = (strings, ...values) => {
    const cssText = values.reduce((acc, v, idx) => acc + textFromCSSResult(v) + strings[idx + 1], strings[0]);
    return new CSSResult(cssText, constructionToken);
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for LitElement usage.
// TODO(justinfagnani): inject version number at build time
(window['litElementVersions'] || (window['litElementVersions'] = []))
    .push('2.4.0');
/**
 * Sentinal value used to avoid calling lit-html's render function when
 * subclasses do not implement `render`
 */
const renderNotImplemented = {};
/**
 * Base element class that manages element properties and attributes, and
 * renders a lit-html template.
 *
 * To define a component, subclass `LitElement` and implement a
 * `render` method to provide the component's template. Define properties
 * using the [[`properties`]] property or the [[`property`]] decorator.
 */
class LitElement extends UpdatingElement {
    /**
     * Return the array of styles to apply to the element.
     * Override this method to integrate into a style management system.
     *
     * @nocollapse
     */
    static getStyles() {
        return this.styles;
    }
    /** @nocollapse */
    static _getUniqueStyles() {
        // Only gather styles once per class
        if (this.hasOwnProperty(JSCompiler_renameProperty('_styles', this))) {
            return;
        }
        // Take care not to call `this.getStyles()` multiple times since this
        // generates new CSSResults each time.
        // TODO(sorvell): Since we do not cache CSSResults by input, any
        // shared styles will generate new stylesheet objects, which is wasteful.
        // This should be addressed when a browser ships constructable
        // stylesheets.
        const userStyles = this.getStyles();
        if (Array.isArray(userStyles)) {
            // De-duplicate styles preserving the _last_ instance in the set.
            // This is a performance optimization to avoid duplicated styles that can
            // occur especially when composing via subclassing.
            // The last item is kept to try to preserve the cascade order with the
            // assumption that it's most important that last added styles override
            // previous styles.
            const addStyles = (styles, set) => styles.reduceRight((set, s) => 
            // Note: On IE set.add() does not return the set
            Array.isArray(s) ? addStyles(s, set) : (set.add(s), set), set);
            // Array.from does not work on Set in IE, otherwise return
            // Array.from(addStyles(userStyles, new Set<CSSResult>())).reverse()
            const set = addStyles(userStyles, new Set());
            const styles = [];
            set.forEach((v) => styles.unshift(v));
            this._styles = styles;
        }
        else {
            this._styles = userStyles === undefined ? [] : [userStyles];
        }
        // Ensure that there are no invalid CSSStyleSheet instances here. They are
        // invalid in two conditions.
        // (1) the sheet is non-constructible (`sheet` of a HTMLStyleElement), but
        //     this is impossible to check except via .replaceSync or use
        // (2) the ShadyCSS polyfill is enabled (:. supportsAdoptingStyleSheets is
        //     false)
        this._styles = this._styles.map((s) => {
            if (s instanceof CSSStyleSheet && !supportsAdoptingStyleSheets) {
                // Flatten the cssText from the passed constructible stylesheet (or
                // undetectable non-constructible stylesheet). The user might have
                // expected to update their stylesheets over time, but the alternative
                // is a crash.
                const cssText = Array.prototype.slice.call(s.cssRules)
                    .reduce((css, rule) => css + rule.cssText, '');
                return unsafeCSS(cssText);
            }
            return s;
        });
    }
    /**
     * Performs element initialization. By default this calls
     * [[`createRenderRoot`]] to create the element [[`renderRoot`]] node and
     * captures any pre-set values for registered properties.
     */
    initialize() {
        super.initialize();
        this.constructor._getUniqueStyles();
        this.renderRoot = this.createRenderRoot();
        // Note, if renderRoot is not a shadowRoot, styles would/could apply to the
        // element's getRootNode(). While this could be done, we're choosing not to
        // support this now since it would require different logic around de-duping.
        if (window.ShadowRoot && this.renderRoot instanceof window.ShadowRoot) {
            this.adoptStyles();
        }
    }
    /**
     * Returns the node into which the element should render and by default
     * creates and returns an open shadowRoot. Implement to customize where the
     * element's DOM is rendered. For example, to render into the element's
     * childNodes, return `this`.
     * @returns {Element|DocumentFragment} Returns a node into which to render.
     */
    createRenderRoot() {
        return this.attachShadow({ mode: 'open' });
    }
    /**
     * Applies styling to the element shadowRoot using the [[`styles`]]
     * property. Styling will apply using `shadowRoot.adoptedStyleSheets` where
     * available and will fallback otherwise. When Shadow DOM is polyfilled,
     * ShadyCSS scopes styles and adds them to the document. When Shadow DOM
     * is available but `adoptedStyleSheets` is not, styles are appended to the
     * end of the `shadowRoot` to [mimic spec
     * behavior](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
     */
    adoptStyles() {
        const styles = this.constructor._styles;
        if (styles.length === 0) {
            return;
        }
        // There are three separate cases here based on Shadow DOM support.
        // (1) shadowRoot polyfilled: use ShadyCSS
        // (2) shadowRoot.adoptedStyleSheets available: use it
        // (3) shadowRoot.adoptedStyleSheets polyfilled: append styles after
        // rendering
        if (window.ShadyCSS !== undefined && !window.ShadyCSS.nativeShadow) {
            window.ShadyCSS.ScopingShim.prepareAdoptedCssText(styles.map((s) => s.cssText), this.localName);
        }
        else if (supportsAdoptingStyleSheets) {
            this.renderRoot.adoptedStyleSheets =
                styles.map((s) => s instanceof CSSStyleSheet ? s : s.styleSheet);
        }
        else {
            // This must be done after rendering so the actual style insertion is done
            // in `update`.
            this._needsShimAdoptedStyleSheets = true;
        }
    }
    connectedCallback() {
        super.connectedCallback();
        // Note, first update/render handles styleElement so we only call this if
        // connected after first update.
        if (this.hasUpdated && window.ShadyCSS !== undefined) {
            window.ShadyCSS.styleElement(this);
        }
    }
    /**
     * Updates the element. This method reflects property values to attributes
     * and calls `render` to render DOM via lit-html. Setting properties inside
     * this method will *not* trigger another update.
     * @param _changedProperties Map of changed properties with old values
     */
    update(changedProperties) {
        // Setting properties in `render` should not trigger an update. Since
        // updates are allowed after super.update, it's important to call `render`
        // before that.
        const templateResult = this.render();
        super.update(changedProperties);
        // If render is not implemented by the component, don't call lit-html render
        if (templateResult !== renderNotImplemented) {
            this.constructor
                .render(templateResult, this.renderRoot, { scopeName: this.localName, eventContext: this });
        }
        // When native Shadow DOM is used but adoptedStyles are not supported,
        // insert styling after rendering to ensure adoptedStyles have highest
        // priority.
        if (this._needsShimAdoptedStyleSheets) {
            this._needsShimAdoptedStyleSheets = false;
            this.constructor._styles.forEach((s) => {
                const style = document.createElement('style');
                style.textContent = s.cssText;
                this.renderRoot.appendChild(style);
            });
        }
    }
    /**
     * Invoked on each update to perform rendering tasks. This method may return
     * any value renderable by lit-html's `NodePart` - typically a
     * `TemplateResult`. Setting properties inside this method will *not* trigger
     * the element to update.
     */
    render() {
        return renderNotImplemented;
    }
}
/**
 * Ensure this class is marked as `finalized` as an optimization ensuring
 * it will not needlessly try to `finalize`.
 *
 * Note this property name is a string to prevent breaking Closure JS Compiler
 * optimizations. See updating-element.ts for more information.
 */
LitElement['finalized'] = true;
/**
 * Reference to the underlying library method used to render the element's
 * DOM. By default, points to the `render` method from lit-html's shady-render
 * module.
 *
 * **Most users will never need to touch this property.**
 *
 * This  property should not be confused with the `render` instance method,
 * which should be overridden to define a template for the element.
 *
 * Advanced users creating a new base class based on LitElement can override
 * this property to point to a custom render method with a signature that
 * matches [shady-render's `render`
 * method](https://lit-html.polymer-project.org/api/modules/shady_render.html#render).
 *
 * @nocollapse
 */
LitElement.render = render$1;

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
const observedForElements = new Set();
const updateRTL = () => {
    const dir = document.documentElement.dir === 'rtl'
        ? document.documentElement.dir
        : 'ltr';
    observedForElements.forEach((el) => {
        el.setAttribute('dir', dir);
    });
};
const rtlObserver = new MutationObserver(updateRTL);
rtlObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['dir'],
});
const canManageContentDirection = (el) => typeof el.startManagingContentDirection === 'undefined';
function SpectrumMixin(constructor) {
    class SlotTextObservingElement extends constructor {
        constructor() {
            super(...arguments);
            /**
             * @private
             */
            this.dir = 'ltr';
        }
        /**
         * @private
         */
        get isLTR() {
            return this.dir === 'ltr';
        }
        connectedCallback() {
            if (!this.hasAttribute('dir')) {
                let dirParent = (this.assignedSlot ||
                    this.parentNode);
                while (dirParent !== document.documentElement &&
                    canManageContentDirection(dirParent)) {
                    dirParent = (dirParent.assignedSlot || // step into the shadow DOM of the parent of a slotted node
                        dirParent.parentNode || // DOM Element detected
                        dirParent
                            .host);
                }
                this.dir =
                    dirParent.dir === 'rtl' ? dirParent.dir : this.dir || 'ltr';
                if (dirParent === document.documentElement) {
                    observedForElements.add(this);
                }
                else {
                    dirParent.startManagingContentDirection(this);
                }
                this._dirParent = dirParent;
            }
            super.connectedCallback();
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            if (this._dirParent) {
                if (this._dirParent === document.documentElement) {
                    observedForElements.delete(this);
                }
                else {
                    this._dirParent.stopManagingContentDirection(this);
                }
                this.removeAttribute('dir');
            }
        }
    }
    __decorate([
        property({ reflect: true })
    ], SlotTextObservingElement.prototype, "dir", void 0);
    return SlotTextObservingElement;
}
class SpectrumElement extends SpectrumMixin(LitElement) {
}

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const previousValues = new WeakMap();
/**
 * For AttributeParts, sets the attribute if the value is defined and removes
 * the attribute if the value is undefined.
 *
 * For other part types, this directive is a no-op.
 */
const ifDefined = directive((value) => (part) => {
    const previousValue = previousValues.get(part);
    if (value === undefined && part instanceof AttributePart) {
        // If the value is undefined, remove the attribute, but only if the value
        // was previously defined.
        if (previousValue !== undefined || !previousValues.has(part)) {
            const name = part.committer.name;
            part.committer.element.removeAttribute(name);
        }
    }
    else if (value !== previousValue) {
        part.setValue(value);
    }
    previousValues.set(part, value);
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
:host,:root{--spectrum-global-animation-duration-0:0ms;--spectrum-global-animation-duration-100:130ms;--spectrum-global-animation-duration-200:160ms;--spectrum-global-animation-duration-300:190ms;--spectrum-global-animation-duration-400:220ms;--spectrum-global-animation-duration-500:250ms;--spectrum-global-animation-duration-600:300ms;--spectrum-global-animation-duration-700:350ms;--spectrum-global-animation-duration-800:400ms;--spectrum-global-animation-duration-900:450ms;--spectrum-global-animation-duration-1000:500ms;--spectrum-global-animation-duration-2000:1000ms;--spectrum-global-animation-duration-4000:2000ms;--spectrum-global-animation-ease-in-out:cubic-bezier(0.45,0,0.4,1);--spectrum-global-animation-ease-in:cubic-bezier(0.5,0,1,1);--spectrum-global-animation-ease-out:cubic-bezier(0,0,0.4,1);--spectrum-global-animation-linear:cubic-bezier(0,0,1,1);--spectrum-global-color-status:Verified;--spectrum-global-color-version:5.1;--spectrum-global-color-static-black:#000;--spectrum-global-color-static-white:#fff;--spectrum-global-color-static-blue:#1473e6;--spectrum-global-color-static-gray-50:#fff;--spectrum-global-color-static-gray-75:#fff;--spectrum-global-color-static-gray-100:#fff;--spectrum-global-color-static-gray-200:#f4f4f4;--spectrum-global-color-static-gray-300:#eaeaea;--spectrum-global-color-static-gray-400:#d3d3d3;--spectrum-global-color-static-gray-500:#bcbcbc;--spectrum-global-color-static-gray-600:#959595;--spectrum-global-color-static-gray-700:#747474;--spectrum-global-color-static-gray-800:#505050;--spectrum-global-color-static-gray-900:#323232;--spectrum-global-color-static-blue-200:#5aa9fa;--spectrum-global-color-static-blue-300:#4b9cf5;--spectrum-global-color-static-blue-400:#378ef0;--spectrum-global-color-static-blue-500:#2680eb;--spectrum-global-color-static-blue-600:#1473e6;--spectrum-global-color-static-blue-700:#0d66d0;--spectrum-global-color-static-blue-800:#095aba;--spectrum-global-color-static-red-400:#ec5b62;--spectrum-global-color-static-red-500:#e34850;--spectrum-global-color-static-red-600:#d7373f;--spectrum-global-color-static-red-700:#c9252d;--spectrum-global-color-static-orange-400:#f29423;--spectrum-global-color-static-orange-500:#e68619;--spectrum-global-color-static-orange-600:#da7b11;--spectrum-global-color-static-orange-700:#cb6f10;--spectrum-global-color-static-green-400:#33ab84;--spectrum-global-color-static-green-500:#2d9d78;--spectrum-global-color-static-green-600:#268e6c;--spectrum-global-color-static-green-700:#12805c;--spectrum-global-color-static-celery-200:#58e06f;--spectrum-global-color-static-celery-300:#51d267;--spectrum-global-color-static-celery-400:#4bc35f;--spectrum-global-color-static-celery-500:#44b556;--spectrum-global-color-static-celery-600:#3da74e;--spectrum-global-color-static-celery-700:#379947;--spectrum-global-color-static-chartreuse-300:#9bec54;--spectrum-global-color-static-chartreuse-400:#8ede49;--spectrum-global-color-static-chartreuse-500:#85d044;--spectrum-global-color-static-chartreuse-600:#7cc33f;--spectrum-global-color-static-chartreuse-700:#73b53a;--spectrum-global-color-static-yellow-200:#ffe22e;--spectrum-global-color-static-yellow-300:#fad900;--spectrum-global-color-static-yellow-400:#edcc00;--spectrum-global-color-static-yellow-500:#dfbf00;--spectrum-global-color-static-yellow-600:#d2b200;--spectrum-global-color-static-yellow-700:#c4a600;--spectrum-global-color-static-magenta-200:#f56bb7;--spectrum-global-color-static-magenta-300:#ec5aaa;--spectrum-global-color-static-magenta-400:#e2499d;--spectrum-global-color-static-magenta-500:#d83790;--spectrum-global-color-static-magenta-600:#ca2982;--spectrum-global-color-static-magenta-700:#bc1c74;--spectrum-global-color-static-fuchsia-400:#cf3edc;--spectrum-global-color-static-fuchsia-500:#c038cc;--spectrum-global-color-static-fuchsia-600:#b130bd;--spectrum-global-color-static-fuchsia-700:#a228ad;--spectrum-global-color-static-purple-400:#9d64e1;--spectrum-global-color-static-purple-500:#9256d9;--spectrum-global-color-static-purple-600:#864ccc;--spectrum-global-color-static-purple-700:#7a42bf;--spectrum-global-color-static-purple-800:#6f38b1;--spectrum-global-color-static-indigo-200:#9090fa;--spectrum-global-color-static-indigo-300:#8282f6;--spectrum-global-color-static-indigo-400:#7575f1;--spectrum-global-color-static-indigo-500:#6767ec;--spectrum-global-color-static-indigo-600:#5c5ce0;--spectrum-global-color-static-indigo-700:#5151d3;--spectrum-global-color-static-seafoam-200:#26c0c7;--spectrum-global-color-static-seafoam-300:#23b2b8;--spectrum-global-color-static-seafoam-400:#20a3a8;--spectrum-global-color-static-seafoam-500:#1b959a;--spectrum-global-color-static-seafoam-600:#16878c;--spectrum-global-color-static-seafoam-700:#0f797d;--spectrum-global-color-opacity-100:1;--spectrum-global-color-opacity-90:0.9;--spectrum-global-color-opacity-80:0.8;--spectrum-global-color-opacity-60:0.6;--spectrum-global-color-opacity-50:0.5;--spectrum-global-color-opacity-42:0.42;--spectrum-global-color-opacity-40:0.4;--spectrum-global-color-opacity-30:0.3;--spectrum-global-color-opacity-25:0.25;--spectrum-global-color-opacity-20:0.2;--spectrum-global-color-opacity-15:0.15;--spectrum-global-color-opacity-10:0.1;--spectrum-global-color-opacity-8:0.08;--spectrum-global-color-opacity-7:0.07;--spectrum-global-color-opacity-6:0.06;--spectrum-global-color-opacity-5:0.05;--spectrum-global-color-opacity-4:0.04;--spectrum-semantic-negative-color-background:var(--spectrum-global-color-static-red-700);--spectrum-semantic-negative-color-default:var(--spectrum-global-color-red-500);--spectrum-semantic-negative-color-state-hover:var(--spectrum-global-color-red-600);--spectrum-semantic-negative-color-dark:var(--spectrum-global-color-red-600);--spectrum-semantic-negative-color-border:var(--spectrum-global-color-red-400);--spectrum-semantic-negative-color-icon:var(--spectrum-global-color-red-600);--spectrum-semantic-negative-color-status:var(--spectrum-global-color-red-400);--spectrum-semantic-negative-color-text-large:var(--spectrum-global-color-red-500);--spectrum-semantic-negative-color-text-small:var(--spectrum-global-color-red-600);--spectrum-semantic-negative-color-state-down:var(--spectrum-global-color-red-700);--spectrum-semantic-negative-color-state-focus:var(--spectrum-global-color-red-400);--spectrum-semantic-notice-color-background:var(--spectrum-global-color-static-orange-700);--spectrum-semantic-notice-color-default:var(--spectrum-global-color-orange-500);--spectrum-semantic-notice-color-dark:var(--spectrum-global-color-orange-600);--spectrum-semantic-notice-color-border:var(--spectrum-global-color-orange-400);--spectrum-semantic-notice-color-icon:var(--spectrum-global-color-orange-600);--spectrum-semantic-notice-color-status:var(--spectrum-global-color-orange-400);--spectrum-semantic-notice-color-text-large:var(--spectrum-global-color-orange-500);--spectrum-semantic-notice-color-text-small:var(--spectrum-global-color-orange-600);--spectrum-semantic-notice-color-state-down:var(--spectrum-global-color-orange-700);--spectrum-semantic-notice-color-state-focus:var(--spectrum-global-color-orange-400);--spectrum-semantic-positive-color-background:var(--spectrum-global-color-static-green-700);--spectrum-semantic-positive-color-default:var(--spectrum-global-color-green-500);--spectrum-semantic-positive-color-dark:var(--spectrum-global-color-green-600);--spectrum-semantic-positive-color-border:var(--spectrum-global-color-green-400);--spectrum-semantic-positive-color-icon:var(--spectrum-global-color-green-600);--spectrum-semantic-positive-color-status:var(--spectrum-global-color-green-400);--spectrum-semantic-positive-color-text-large:var(--spectrum-global-color-green-500);--spectrum-semantic-positive-color-text-small:var(--spectrum-global-color-green-600);--spectrum-semantic-positive-color-state-down:var(--spectrum-global-color-green-700);--spectrum-semantic-positive-color-state-focus:var(--spectrum-global-color-green-400);--spectrum-semantic-informative-color-background:var(--spectrum-global-color-static-blue-700);--spectrum-semantic-informative-color-default:var(--spectrum-global-color-blue-500);--spectrum-semantic-informative-color-dark:var(--spectrum-global-color-blue-600);--spectrum-semantic-informative-color-border:var(--spectrum-global-color-blue-400);--spectrum-semantic-informative-color-icon:var(--spectrum-global-color-blue-600);--spectrum-semantic-informative-color-status:var(--spectrum-global-color-blue-400);--spectrum-semantic-informative-color-text-large:var(--spectrum-global-color-blue-500);--spectrum-semantic-informative-color-text-small:var(--spectrum-global-color-blue-600);--spectrum-semantic-informative-color-state-down:var(--spectrum-global-color-blue-700);--spectrum-semantic-informative-color-state-focus:var(--spectrum-global-color-blue-400);--spectrum-semantic-cta-color-background-default:var(--spectrum-global-color-static-blue-600);--spectrum-semantic-cta-color-background-hover:var(--spectrum-global-color-static-blue-700);--spectrum-semantic-cta-color-background-down:var(--spectrum-global-color-static-blue-800);--spectrum-semantic-cta-color-background-key-focus:var(--spectrum-global-color-static-blue-600);--spectrum-semantic-background-color-key-focus:var(--spectrum-global-color-static-blue-600);--spectrum-semantic-neutral-color-background:var(--spectrum-global-color-static-gray-700);--spectrum-semantic-presence-color-1:var(--spectrum-global-color-static-red-500);--spectrum-semantic-presence-color-2:var(--spectrum-global-color-static-orange-400);--spectrum-semantic-presence-color-3:var(--spectrum-global-color-static-yellow-400);--spectrum-semantic-presence-color-4:#4bcca2;--spectrum-semantic-presence-color-5:#00c7ff;--spectrum-semantic-presence-color-6:#008cb8;--spectrum-semantic-presence-color-7:#7e4bf3;--spectrum-semantic-presence-color-8:var(--spectrum-global-color-static-fuchsia-600);--spectrum-global-dimension-static-size-0:0px;--spectrum-global-dimension-static-size-10:1px;--spectrum-global-dimension-static-size-25:2px;--spectrum-global-dimension-static-size-50:4px;--spectrum-global-dimension-static-size-40:3px;--spectrum-global-dimension-static-size-65:5px;--spectrum-global-dimension-static-size-100:8px;--spectrum-global-dimension-static-size-115:9px;--spectrum-global-dimension-static-size-125:10px;--spectrum-global-dimension-static-size-130:11px;--spectrum-global-dimension-static-size-150:12px;--spectrum-global-dimension-static-size-160:13px;--spectrum-global-dimension-static-size-175:14px;--spectrum-global-dimension-static-size-200:16px;--spectrum-global-dimension-static-size-225:18px;--spectrum-global-dimension-static-size-250:20px;--spectrum-global-dimension-static-size-300:24px;--spectrum-global-dimension-static-size-400:32px;--spectrum-global-dimension-static-size-450:36px;--spectrum-global-dimension-static-size-500:40px;--spectrum-global-dimension-static-size-550:44px;--spectrum-global-dimension-static-size-600:48px;--spectrum-global-dimension-static-size-700:56px;--spectrum-global-dimension-static-size-800:64px;--spectrum-global-dimension-static-size-900:72px;--spectrum-global-dimension-static-size-1000:80px;--spectrum-global-dimension-static-size-1200:96px;--spectrum-global-dimension-static-size-1700:136px;--spectrum-global-dimension-static-size-2400:192px;--spectrum-global-dimension-static-size-2600:208px;--spectrum-global-dimension-static-size-3400:272px;--spectrum-global-dimension-static-size-3600:288px;--spectrum-global-dimension-static-size-4600:368px;--spectrum-global-dimension-static-size-5000:400px;--spectrum-global-dimension-static-size-6000:480px;--spectrum-global-dimension-static-font-size-50:11px;--spectrum-global-dimension-static-font-size-75:12px;--spectrum-global-dimension-static-font-size-100:14px;--spectrum-global-dimension-static-font-size-150:15px;--spectrum-global-dimension-static-font-size-200:16px;--spectrum-global-dimension-static-font-size-300:18px;--spectrum-global-dimension-static-font-size-400:20px;--spectrum-global-dimension-static-font-size-500:22px;--spectrum-global-dimension-static-font-size-600:25px;--spectrum-global-dimension-static-font-size-700:28px;--spectrum-global-dimension-static-font-size-800:32px;--spectrum-global-dimension-static-font-size-900:36px;--spectrum-global-dimension-static-font-size-1000:40px;--spectrum-global-dimension-static-percent-50:50%;--spectrum-global-dimension-static-percent-100:100%;--spectrum-global-dimension-static-breakpoint-xsmall:304px;--spectrum-global-dimension-static-breakpoint-small:768px;--spectrum-global-dimension-static-breakpoint-medium:1280px;--spectrum-global-dimension-static-breakpoint-large:1768px;--spectrum-global-dimension-static-breakpoint-xlarge:2160px;--spectrum-global-dimension-static-grid-columns:12;--spectrum-global-dimension-static-grid-fluid-width:100%;--spectrum-global-dimension-static-grid-fixed-max-width:1280px;--spectrum-global-font-family-base:adobe-clean,"Source Sans Pro",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,"Trebuchet MS","Lucida Grande",sans-serif;--spectrum-global-font-family-serif:adobe-clean-serif,"Source Serif Pro",Georgia,serif;--spectrum-global-font-family-code:"Source Code Pro",Monaco,monospace;--spectrum-global-font-weight-thin:100;--spectrum-global-font-weight-ultra-light:200;--spectrum-global-font-weight-light:300;--spectrum-global-font-weight-regular:400;--spectrum-global-font-weight-medium:500;--spectrum-global-font-weight-semi-bold:600;--spectrum-global-font-weight-bold:700;--spectrum-global-font-weight-extra-bold:800;--spectrum-global-font-weight-black:900;--spectrum-global-font-style-regular:normal;--spectrum-global-font-style-italic:italic;--spectrum-global-font-letter-spacing-none:0;--spectrum-global-font-letter-spacing-small:0.0125em;--spectrum-global-font-letter-spacing-han:0.05em;--spectrum-global-font-letter-spacing-medium:0.06em;--spectrum-global-font-line-height-large:1.7;--spectrum-global-font-line-height-medium:1.5;--spectrum-global-font-line-height-small:1.3;--spectrum-global-font-multiplier-25:0.25em;--spectrum-global-font-multiplier-75:0.75em;--spectrum-alias-border-size-thin:var(--spectrum-global-dimension-static-size-10);--spectrum-alias-border-size-thick:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-border-size-thicker:var(--spectrum-global-dimension-static-size-50);--spectrum-alias-border-size-thickest:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-border-offset-thin:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-border-offset-thick:var(--spectrum-global-dimension-static-size-50);--spectrum-alias-border-offset-thicker:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-border-offset-thickest:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-grid-baseline:var(--spectrum-global-dimension-static-size-100);--spectrum-alias-grid-gutter-xsmall:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-grid-gutter-small:var(--spectrum-global-dimension-static-size-300);--spectrum-alias-grid-gutter-medium:var(--spectrum-global-dimension-static-size-400);--spectrum-alias-grid-gutter-large:var(--spectrum-global-dimension-static-size-500);--spectrum-alias-grid-gutter-xlarge:var(--spectrum-global-dimension-static-size-600);--spectrum-alias-grid-margin-xsmall:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-grid-margin-small:var(--spectrum-global-dimension-static-size-300);--spectrum-alias-grid-margin-medium:var(--spectrum-global-dimension-static-size-400);--spectrum-alias-grid-margin-large:var(--spectrum-global-dimension-static-size-500);--spectrum-alias-grid-margin-xlarge:var(--spectrum-global-dimension-static-size-600);--spectrum-alias-grid-layout-region-margin-bottom-xsmall:var(--spectrum-global-dimension-static-size-200);--spectrum-alias-grid-layout-region-margin-bottom-small:var(--spectrum-global-dimension-static-size-300);--spectrum-alias-grid-layout-region-margin-bottom-medium:var(--spectrum-global-dimension-static-size-400);--spectrum-alias-grid-layout-region-margin-bottom-large:var(--spectrum-global-dimension-static-size-500);--spectrum-alias-grid-layout-region-margin-bottom-xlarge:var(--spectrum-global-dimension-static-size-600);--spectrum-alias-radial-reaction-size-default:var(--spectrum-global-dimension-static-size-550);--spectrum-alias-font-family-ar:myriad-arabic,adobe-clean,"Source Sans Pro",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,"Trebuchet MS","Lucida Grande",sans-serif;--spectrum-alias-font-family-he:myriad-hebrew,adobe-clean,"Source Sans Pro",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,"Trebuchet MS","Lucida Grande",sans-serif;--spectrum-alias-font-family-zh:adobe-clean-han-traditional,source-han-traditional,"MingLiu","Heiti TC Light","sans-serif";--spectrum-alias-font-family-zhhans:adobe-clean-han-simplified-c,source-han-simplified-c,"SimSun","Heiti SC Light","sans-serif";--spectrum-alias-font-family-ko:adobe-clean-han-korean,source-han-korean,"Malgun Gothic","Apple Gothic","sans-serif";--spectrum-alias-font-family-ja:adobe-clean-han-japanese,source-han-japanese,"Yu Gothic","\\30E1 \\30A4 \\30EA \\30AA","\\30D2 \\30E9 \\30AE \\30CE \\89D2 \\30B4  Pro W3","Hiragino Kaku Gothic Pro W3","Osaka","\\FF2D \\FF33 \\FF30 \\30B4 \\30B7 \\30C3 \\30AF","MS PGothic","sans-serif";--spectrum-alias-font-family-condensed:adobe-clean-han-traditional,source-han-traditional,"MingLiu","Heiti TC Light",adobe-clean,"Source Sans Pro",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,"Trebuchet MS","Lucida Grande",sans-serif;--spectrum-alias-line-height-body:var(--spectrum-global-font-line-height-medium);--spectrum-alias-line-height-title:var(--spectrum-global-font-line-height-small);--spectrum-alias-body-han-text-line-height:var(--spectrum-global-font-line-height-large);--spectrum-alias-body-text-font-family:var(--spectrum-global-font-family-base);--spectrum-alias-body-text-line-height:var(--spectrum-global-font-line-height-medium);--spectrum-alias-body-text-font-weight:var(--spectrum-global-font-weight-regular);--spectrum-alias-body-text-font-weight-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-button-text-line-height:var(--spectrum-global-font-line-height-small);--spectrum-alias-heading-han-text-line-height:var(--spectrum-global-font-line-height-medium);--spectrum-alias-heading-text-line-height:var(--spectrum-global-font-line-height-small);--spectrum-alias-heading-text-font-weight-regular:var(--spectrum-global-font-weight-bold);--spectrum-alias-heading-text-font-weight-regular-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-heading-text-font-weight-quiet:var(--spectrum-global-font-weight-light);--spectrum-alias-heading-text-font-weight-quiet-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-heading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-heading-text-font-weight-strong-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-subheading-text-font-weight:var(--spectrum-global-font-weight-bold);--spectrum-alias-subheading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-detail-text-font-weight:var(--spectrum-global-font-weight-bold);--spectrum-alias-detail-text-font-weight-light:var(--spectrum-global-font-weight-regular);--spectrum-alias-detail-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-serif-text-font-family:var(--spectrum-global-font-family-serif);--spectrum-alias-article-text-font-family:var(--spectrum-global-font-family-serif);--spectrum-alias-article-body-text-font-weight:var(--spectrum-global-font-weight-regular);--spectrum-alias-article-body-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-article-heading-text-font-weight:var(--spectrum-global-font-weight-bold);--spectrum-alias-article-heading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-article-heading-text-font-weight-quiet:var(--spectrum-global-font-weight-regular);--spectrum-alias-article-heading-text-font-weight-quiet-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-article-subheading-text-font-weight:var(--spectrum-global-font-weight-bold);--spectrum-alias-article-subheading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-article-detail-text-font-weight:var(--spectrum-global-font-weight-regular);--spectrum-alias-article-detail-text-font-weight-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-code-text-font-family:var(--spectrum-global-font-family-code);--spectrum-alias-han-heading-text-font-weight-regular:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-heading-text-font-weight-regular-emphasis:var(--spectrum-global-font-weight-extra-bold);--spectrum-alias-han-heading-text-font-weight-regular-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-han-heading-text-font-weight-quiet:var(--spectrum-global-font-weight-light);--spectrum-alias-han-heading-text-font-weight-quiet-emphasis:var(--spectrum-global-font-weight-regular);--spectrum-alias-han-heading-text-font-weight-quiet-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-heading-text-font-weight-light:var(--spectrum-global-font-weight-light);--spectrum-alias-han-heading-text-font-weight-light-emphasis:var(--spectrum-global-font-weight-regular);--spectrum-alias-han-heading-text-font-weight-light-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-heading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-han-heading-text-font-weight-strong-emphasis:var(--spectrum-global-font-weight-black);--spectrum-alias-han-heading-text-font-weight-strong-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-han-heading-text-font-weight-heavy:var(--spectrum-global-font-weight-black);--spectrum-alias-han-heading-text-font-weight-heavy-emphasis:var(--spectrum-global-font-weight-black);--spectrum-alias-han-heading-text-font-weight-heavy-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-han-body-text-font-weight-regular:var(--spectrum-global-font-weight-regular);--spectrum-alias-han-body-text-font-weight-emphasis:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-body-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-han-subheading-text-font-weight-regular:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-subheading-text-font-weight-emphasis:var(--spectrum-global-font-weight-extra-bold);--spectrum-alias-han-subheading-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-han-detail-text-font-weight:var(--spectrum-global-font-weight-regular);--spectrum-alias-han-detail-text-font-weight-emphasis:var(--spectrum-global-font-weight-bold);--spectrum-alias-han-detail-text-font-weight-strong:var(--spectrum-global-font-weight-black);--spectrum-alias-code-text-font-weight-regular:var(--spectrum-global-font-weight-regular);--spectrum-alias-code-text-font-weight-strong:var(--spectrum-global-font-weight-bold);--spectrum-alias-code-text-line-height:var(--spectrum-global-font-line-height-medium);--spectrum-alias-heading-margin-bottom:var(--spectrum-global-font-multiplier-25);--spectrum-alias-body-margin-bottom:var(--spectrum-global-font-multiplier-75);--spectrum-alias-focus-ring-gap:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-focus-ring-size:var(--spectrum-global-dimension-static-size-25);--spectrum-alias-loupe-entry-animation-duration:var(--spectrum-global-animation-duration-300);--spectrum-alias-loupe-exit-animation-duration:var(--spectrum-global-animation-duration-300);--spectrum-alias-dropshadow-blur:var(--spectrum-global-dimension-size-50);--spectrum-alias-dropshadow-offset-y:var(--spectrum-global-dimension-size-10);--spectrum-alias-font-size-default:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-line-height-small:var(--spectrum-global-dimension-size-200);--spectrum-alias-line-height-medium:var(--spectrum-global-dimension-size-250);--spectrum-alias-line-height-large:var(--spectrum-global-dimension-size-300);--spectrum-alias-line-height-xlarge:var(--spectrum-global-dimension-size-400);--spectrum-alias-line-height-xxlarge:var(--spectrum-global-dimension-size-600);--spectrum-alias-layout-label-gap-size:var(--spectrum-global-dimension-size-100);--spectrum-alias-pill-button-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-pill-button-text-baseline:var(--spectrum-global-dimension-static-size-150);--spectrum-alias-border-radius-xsmall:var(--spectrum-global-dimension-size-10);--spectrum-alias-border-radius-small:var(--spectrum-global-dimension-size-25);--spectrum-alias-border-radius-regular:var(--spectrum-global-dimension-size-50);--spectrum-alias-border-radius-medium:var(--spectrum-global-dimension-size-100);--spectrum-alias-border-radius-large:var(--spectrum-global-dimension-size-200);--spectrum-alias-single-line-height:var(--spectrum-global-dimension-size-400);--spectrum-alias-single-line-width:var(--spectrum-global-dimension-size-2400);--spectrum-alias-workflow-icon-size:var(--spectrum-global-dimension-size-225);--spectrum-alias-heading-display1-text-size:var(--spectrum-global-dimension-font-size-1300);--spectrum-alias-heading-xxxl-text-size:var(--spectrum-global-dimension-font-size-1300);--spectrum-alias-heading-han-display1-text-size:var(--spectrum-global-dimension-font-size-1300);--spectrum-alias-heading-han-xxxl-text-size:var(--spectrum-global-dimension-font-size-1300);--spectrum-alias-heading-han-display1-margin-top:var(--spectrum-global-dimension-font-size-1200);--spectrum-alias-heading-han-xxxl-margin-top:var(--spectrum-global-dimension-font-size-1200);--spectrum-alias-heading-display1-margin-top:var(--spectrum-global-dimension-font-size-1200);--spectrum-alias-heading-xxxl-margin-top:var(--spectrum-global-dimension-font-size-1200);--spectrum-alias-heading-display2-text-size:var(--spectrum-global-dimension-font-size-1100);--spectrum-alias-heading-xxl-text-size:var(--spectrum-global-dimension-font-size-1100);--spectrum-alias-heading-display2-margin-top:var(--spectrum-global-dimension-font-size-900);--spectrum-alias-heading-xxl-margin-top:var(--spectrum-global-dimension-font-size-900);--spectrum-alias-heading-han-display2-text-size:var(--spectrum-global-dimension-font-size-900);--spectrum-alias-heading-han-xxl-text-size:var(--spectrum-global-dimension-font-size-900);--spectrum-alias-heading-han-display2-margin-top:var(--spectrum-global-dimension-font-size-800);--spectrum-alias-heading-han-xxl-margin-top:var(--spectrum-global-dimension-font-size-800);--spectrum-alias-heading1-text-size:var(--spectrum-global-dimension-font-size-900);--spectrum-alias-heading-xl-text-size:var(--spectrum-global-dimension-font-size-900);--spectrum-alias-heading1-margin-top:var(--spectrum-global-dimension-font-size-800);--spectrum-alias-heading-xl-margin-top:var(--spectrum-global-dimension-font-size-800);--spectrum-alias-heading1-han-text-size:var(--spectrum-global-dimension-font-size-800);--spectrum-alias-heading-han-xl-text-size:var(--spectrum-global-dimension-font-size-800);--spectrum-alias-heading1-han-margin-top:var(--spectrum-global-dimension-font-size-700);--spectrum-alias-heading-han-xl-margin-top:var(--spectrum-global-dimension-font-size-700);--spectrum-alias-heading2-text-size:var(--spectrum-global-dimension-font-size-700);--spectrum-alias-heading-l-text-size:var(--spectrum-global-dimension-font-size-700);--spectrum-alias-heading2-margin-top:var(--spectrum-global-dimension-font-size-600);--spectrum-alias-heading-l-margin-top:var(--spectrum-global-dimension-font-size-600);--spectrum-alias-heading2-han-text-size:var(--spectrum-global-dimension-font-size-600);--spectrum-alias-heading-han-l-text-size:var(--spectrum-global-dimension-font-size-600);--spectrum-alias-heading2-han-margin-top:var(--spectrum-global-dimension-font-size-500);--spectrum-alias-heading-han-l-margin-top:var(--spectrum-global-dimension-font-size-500);--spectrum-alias-heading3-text-size:var(--spectrum-global-dimension-font-size-500);--spectrum-alias-heading-m-text-size:var(--spectrum-global-dimension-font-size-500);--spectrum-alias-heading3-margin-top:var(--spectrum-global-dimension-font-size-400);--spectrum-alias-heading-m-margin-top:var(--spectrum-global-dimension-font-size-400);--spectrum-alias-heading3-han-text-size:var(--spectrum-global-dimension-font-size-400);--spectrum-alias-heading-han-m-text-size:var(--spectrum-global-dimension-font-size-400);--spectrum-alias-heading3-han-margin-top:var(--spectrum-global-dimension-font-size-300);--spectrum-alias-heading-han-m-margin-top:var(--spectrum-global-dimension-font-size-300);--spectrum-alias-heading4-text-size:var(--spectrum-global-dimension-font-size-300);--spectrum-alias-heading-s-text-size:var(--spectrum-global-dimension-font-size-300);--spectrum-alias-heading4-margin-top:var(--spectrum-global-dimension-font-size-200);--spectrum-alias-heading-s-margin-top:var(--spectrum-global-dimension-font-size-200);--spectrum-alias-heading5-text-size:var(--spectrum-global-dimension-font-size-200);--spectrum-alias-heading-xs-text-size:var(--spectrum-global-dimension-font-size-200);--spectrum-alias-heading5-margin-top:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-heading-xs-margin-top:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-heading6-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-heading-xxs-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-alias-heading6-margin-top:var(--spectrum-global-dimension-font-size-75);--spectrum-alias-heading-xxs-margin-top:var(--spectrum-global-dimension-font-size-75);--spectrum-alias-background-color-default:var(--spectrum-global-color-gray-100);--spectrum-alias-background-color-transparent:transparent;--spectrum-alias-background-color-label-gray:#707070;--spectrum-alias-background-color-quickactions-overlay:rgba(0,0,0,0.2);--spectrum-alias-placeholder-text-color:var(--spectrum-global-color-gray-600);--spectrum-alias-placeholder-text-color-hover:var(--spectrum-global-color-gray-900);--spectrum-alias-placeholder-text-color-down:var(--spectrum-global-color-gray-900);--spectrum-alias-placeholder-text-color-selected:var(--spectrum-global-color-gray-800);--spectrum-alias-label-text-color:var(--spectrum-global-color-gray-700);--spectrum-alias-text-color:var(--spectrum-global-color-gray-800);--spectrum-alias-text-color-hover:var(--spectrum-global-color-gray-900);--spectrum-alias-text-color-down:var(--spectrum-global-color-gray-900);--spectrum-alias-text-color-key-focus:var(--spectrum-global-color-blue-600);--spectrum-alias-text-color-mouse-focus:var(--spectrum-global-color-blue-600);--spectrum-alias-text-color-disabled:var(--spectrum-global-color-gray-500);--spectrum-alias-text-color-invalid:var(--spectrum-global-color-red-500);--spectrum-alias-text-color-selected:var(--spectrum-global-color-blue-600);--spectrum-alias-text-color-selected-neutral:var(--spectrum-global-color-gray-900);--spectrum-alias-title-text-color:var(--spectrum-global-color-gray-900);--spectrum-alias-heading-text-color:var(--spectrum-global-color-gray-900);--spectrum-alias-border-color:var(--spectrum-global-color-gray-400);--spectrum-alias-border-color-hover:var(--spectrum-global-color-gray-500);--spectrum-alias-border-color-down:var(--spectrum-global-color-gray-500);--spectrum-alias-border-color-focus:var(--spectrum-global-color-blue-400);--spectrum-alias-border-color-mouse-focus:var(--spectrum-global-color-blue-500);--spectrum-alias-border-color-disabled:var(--spectrum-global-color-gray-200);--spectrum-alias-border-color-extralight:var(--spectrum-global-color-gray-100);--spectrum-alias-border-color-light:var(--spectrum-global-color-gray-200);--spectrum-alias-border-color-mid:var(--spectrum-global-color-gray-300);--spectrum-alias-border-color-dark:var(--spectrum-global-color-gray-400);--spectrum-alias-border-color-transparent:transparent;--spectrum-alias-border-color-translucent-dark:rgba(0,0,0,0.05);--spectrum-alias-border-color-translucent-darker:rgba(0,0,0,0.1);--spectrum-alias-focus-color:var(--spectrum-global-color-blue-400);--spectrum-alias-focus-ring-color:var(--spectrum-alias-focus-color);--spectrum-alias-track-color-default:var(--spectrum-global-color-gray-300);--spectrum-alias-track-color-disabled:var(--spectrum-global-color-gray-300);--spectrum-alias-track-color-over-background:hsla(0,0%,100%,0.2);--spectrum-alias-icon-color:var(--spectrum-global-color-gray-700);--spectrum-alias-icon-color-over-background:var(--spectrum-global-color-static-white);--spectrum-alias-icon-color-hover:var(--spectrum-global-color-gray-900);--spectrum-alias-icon-color-down:var(--spectrum-global-color-gray-900);--spectrum-alias-icon-color-focus:var(--spectrum-global-color-gray-900);--spectrum-alias-icon-color-disabled:var(--spectrum-global-color-gray-400);--spectrum-alias-icon-color-selected-neutral:var(--spectrum-global-color-gray-900);--spectrum-alias-icon-color-selected:var(--spectrum-global-color-blue-500);--spectrum-alias-icon-color-selected-hover:var(--spectrum-global-color-blue-600);--spectrum-alias-icon-color-selected-down:var(--spectrum-global-color-blue-700);--spectrum-alias-icon-color-selected-focus:var(--spectrum-global-color-blue-600);--spectrum-alias-icon-color-error:var(--spectrum-global-color-red-400);--spectrum-alias-toolbar-background-color:var(--spectrum-global-color-gray-100);--spectrum-alias-colorhandle-outer-border-color:rgba(0,0,0,0.42);--spectrum-alias-categorical-color-1:var(--spectrum-global-color-static-seafoam-200);--spectrum-alias-categorical-color-2:var(--spectrum-global-color-static-indigo-700);--spectrum-alias-categorical-color-3:var(--spectrum-global-color-static-orange-500);--spectrum-alias-categorical-color-4:var(--spectrum-global-color-static-magenta-500);--spectrum-alias-categorical-color-5:var(--spectrum-global-color-static-indigo-200);--spectrum-alias-categorical-color-6:var(--spectrum-global-color-static-celery-200);--spectrum-alias-categorical-color-7:var(--spectrum-global-color-static-blue-500);--spectrum-alias-categorical-color-8:var(--spectrum-global-color-static-purple-800);--spectrum-alias-categorical-color-9:var(--spectrum-global-color-static-yellow-500);--spectrum-alias-categorical-color-10:var(--spectrum-global-color-static-orange-700);--spectrum-alias-categorical-color-11:var(--spectrum-global-color-static-green-600);--spectrum-alias-categorical-color-12:var(--spectrum-global-color-static-chartreuse-300);--spectrum-alias-categorical-color-13:var(--spectrum-global-color-static-blue-200);--spectrum-alias-categorical-color-14:var(--spectrum-global-color-static-fuchsia-500);--spectrum-alias-categorical-color-15:var(--spectrum-global-color-static-magenta-200);--spectrum-alias-categorical-color-16:var(--spectrum-global-color-static-yellow-200);--spectrum-font-fallbacks-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;--spectrum-font-family-base:var(--spectrum-alias-body-text-font-family);--spectrum-font-family-ar:var(--spectrum-alias-font-family-ar);--spectrum-font-family-he:var(--spectrum-alias-font-family-he);--spectrum-font-family-zh:var(--spectrum-alias-font-family-zh);--spectrum-font-family-zhhans:var(--spectrum-alias-font-family-zhhans);--spectrum-font-family-ko:var(--spectrum-alias-font-family-ko);--spectrum-font-family-ja:var(--spectrum-alias-font-family-ja);--spectrum-font-family-han:var(--spectrum-alias-font-family-zh);--spectrum-font-family-zhhant:var(--spectrum-alias-font-family-zh);--spectrum-text-size:var(--spectrum-alias-font-size-default);--spectrum-text-body-line-height:var(--spectrum-alias-line-height-medium);--spectrum-text-size-text-label:var(--spectrum-label-text-size);--spectrum-line-height-text-label:var(--spectrum-label-text-line-height);font-family:var(--spectrum-font-family-base);font-size:var(--spectrum-text-size)}:host:lang(ar),:root:lang(ar){font-family:var(--spectrum-font-family-ar)}:host:lang(he),:root:lang(he){font-family:var(--spectrum-font-family-he)}:host:lang(zh-Hans),:root:lang(zh-Hans){font-family:var(--spectrum-font-family-zhhans)}:host:lang(zh-Hant),:root:lang(zh-Hant){font-family:var(--spectrum-font-family-zhhant)}:host:lang(zh),:root:lang(zh){font-family:var(--spectrum-font-family-zh)}:host:lang(ko),:root:lang(ko){font-family:var(--spectrum-font-family-ko)}:host:lang(ja),:root:lang(ja){font-family:var(--spectrum-font-family-ja)}:host{display:block}#scale,#theme{width:100%;height:100%}
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
const ScaleValues = ['medium', 'large'];
const ColorValues = ['light', 'lightest', 'dark', 'darkest'];
class Theme extends HTMLElement {
    constructor() {
        super();
        this.hasAdoptedStyles = false;
        this._color = '';
        this._scale = '';
        this.trackedChildren = new Set();
        this.attachShadow({ mode: 'open' });
        const node = document.importNode(Theme.template.content, true);
        this.shadowRoot.appendChild(node);
        this.shouldAdoptStyles();
        this.addEventListener('sp-query-theme', this.onQueryTheme);
    }
    static get observedAttributes() {
        return ['color', 'scale'];
    }
    attributeChangedCallback(attrName, old, value) {
        if (old === value) {
            return;
        }
        if (attrName === 'color') {
            this.color = value;
        }
        else if (attrName === 'scale') {
            this.scale = value;
        }
    }
    requestUpdate() {
        this.hasAdoptedStyles = false;
        if (window.ShadyCSS !== undefined && !window.ShadyCSS.nativeShadow) {
            window.ShadyCSS.styleElement(this);
        }
        else {
            this.shouldAdoptStyles();
        }
    }
    get core() {
        return 'core';
    }
    get color() {
        const themeFragments = Theme.themeFragmentsByKind.get('color');
        const { name } = (themeFragments && themeFragments.get('default')) || {};
        return this._color || name || '';
    }
    set color(newValue) {
        if (newValue === this._color)
            return;
        const color = !!newValue && ColorValues.includes(newValue)
            ? newValue
            : this.color;
        if (color !== this._color) {
            this._color = color;
            this.requestUpdate();
        }
        if (color) {
            this.setAttribute('color', color);
        }
        else {
            this.removeAttribute('color');
        }
    }
    get scale() {
        const themeFragments = Theme.themeFragmentsByKind.get('scale');
        const { name } = (themeFragments && themeFragments.get('default')) || {};
        return this._scale || name || '';
    }
    set scale(newValue) {
        if (newValue === this._scale)
            return;
        const scale = !!newValue && ScaleValues.includes(newValue)
            ? newValue
            : this.scale;
        if (scale !== this._scale) {
            this._scale = scale;
            this.requestUpdate();
        }
        if (scale) {
            this.setAttribute('scale', scale);
        }
        else {
            this.removeAttribute('scale');
        }
    }
    get styles() {
        const themeKinds = [
            ...Theme.themeFragmentsByKind.keys(),
        ];
        const styles = themeKinds.reduce((acc, kind) => {
            const kindFragments = Theme.themeFragmentsByKind.get(kind);
            const { [kind]: name } = this;
            const currentStyles = kindFragments.get(name);
            if (currentStyles) {
                acc.push(currentStyles.styles);
            }
            return acc;
        }, []);
        return [...styles];
    }
    static get template() {
        if (!this.templateElement) {
            this.templateElement = document.createElement('template');
            this.templateElement.innerHTML = '<slot></slot>';
        }
        return this.templateElement;
    }
    onQueryTheme(event) {
        if (event.defaultPrevented) {
            return;
        }
        event.preventDefault();
        const { detail: theme } = event;
        theme.color = this.color || undefined;
        theme.scale = this.scale || undefined;
    }
    connectedCallback() {
        this.shouldAdoptStyles();
        // Note, first update/render handles styleElement so we only call this if
        // connected after first update.
        /* c8 ignore next 3 */
        if (window.ShadyCSS !== undefined) {
            window.ShadyCSS.styleElement(this);
        }
        // Add `this` to the instances array.
        Theme.instances.add(this);
        const manageDir = () => {
            const { dir } = this;
            this.trackedChildren.forEach((el) => {
                el.setAttribute('dir', dir === 'rtl' ? dir : 'ltr');
            });
        };
        if (!this.observer) {
            this.observer = new MutationObserver(manageDir);
        }
        this.observer.observe(this, {
            attributes: true,
            attributeFilter: ['dir'],
        });
        if (!this.hasAttribute('dir')) {
            let dirParent = (this.assignedSlot ||
                this.parentNode);
            while (dirParent !== document.documentElement &&
                !(dirParent instanceof Theme)) {
                dirParent = (dirParent.assignedSlot || // step into the shadow DOM of the parent of a slotted node
                    dirParent.parentNode || // DOM Element detected
                    dirParent.host);
            }
            this.dir = dirParent.dir === 'rtl' ? dirParent.dir : 'ltr';
        }
        requestAnimationFrame(() => manageDir());
    }
    disconnectedCallback() {
        // Remove `this` to the instances array.
        Theme.instances.delete(this);
        this.observer.disconnect();
    }
    startManagingContentDirection(el) {
        this.trackedChildren.add(el);
    }
    stopManagingContentDirection(el) {
        this.trackedChildren.delete(el);
    }
    shouldAdoptStyles() {
        /* c8 ignore next 3 */
        if (!this.hasAdoptedStyles) {
            this.adoptStyles();
        }
    }
    get expectedFragments() {
        // color, scale and core
        return 3;
    }
    adoptStyles() {
        const styles = this.styles; // No test coverage on Edge
        if (styles.length < this.expectedFragments)
            return;
        // There are three separate cases here based on Shadow DOM support.
        // (1) shadowRoot polyfilled: use ShadyCSS
        // (2) shadowRoot.adoptedStyleSheets available: use it.
        // (3) shadowRoot.adoptedStyleSheets polyfilled: append styles after
        // rendering
        /* c8 ignore next */ if (window.ShadyCSS !== undefined &&
            !window.ShadyCSS.nativeShadow &&
            window.ShadyCSS.ScopingShim) {
            // For browsers using the shim, there seems to be one set of
            // processed styles per template, so it is hard to nest styles. So,
            // for those, we load in all style fragments and then switch using a
            // host selector (e.g. :host([color='dark']))
            const fragmentCSS = [];
            for (const [kind, fragments] of Theme.themeFragmentsByKind) {
                for (const [name, { styles }] of fragments) {
                    if (name === 'default')
                        continue;
                    let cssText = styles.cssText;
                    if (!Theme.defaultFragments.has(name)) {
                        cssText = cssText.replace(':host', `:host([${kind}='${name}'])`);
                    }
                    fragmentCSS.push(cssText);
                }
            }
            window.ShadyCSS.ScopingShim.prepareAdoptedCssText(fragmentCSS, this.localName);
            window.ShadyCSS.prepareTemplate(Theme.template, this.localName);
        }
        else if (supportsAdoptingStyleSheets) {
            const styleSheets = [];
            for (const style of styles) {
                styleSheets.push(style.styleSheet);
            }
            this.shadowRoot.adoptedStyleSheets = styleSheets;
        }
        else {
            const styleNodes = this.shadowRoot.querySelectorAll('style');
            styleNodes.forEach((element) => element.remove());
            styles.forEach((s) => {
                const style = document.createElement('style');
                style.textContent = s.cssText;
                this.shadowRoot.appendChild(style);
            });
        }
        this.hasAdoptedStyles = true;
    }
    static registerThemeFragment(name, kind, styles) {
        const fragmentMap = Theme.themeFragmentsByKind.get(kind) || new Map();
        if (fragmentMap.size === 0) {
            Theme.themeFragmentsByKind.set(kind, fragmentMap);
            // we're adding our first fragment for this kind, set as default
            fragmentMap.set('default', { name, styles });
            Theme.defaultFragments.add(name);
        }
        fragmentMap.set(name, { name, styles });
        Theme.instances.forEach((instance) => instance.shouldAdoptStyles());
    }
}
Theme.themeFragmentsByKind = new Map();
Theme.defaultFragments = new Set(['core']);
Theme.instances = new Set();
Theme.registerThemeFragment('core', 'core', styles);

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
customElements.define('sp-theme', Theme);

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
const styles$1 = css `
:host,:root{--spectrum-global-color-status:Verified;--spectrum-global-color-version:5.1;--spectrum-global-color-celery-400:#44b556;--spectrum-global-color-celery-500:#3da74e;--spectrum-global-color-celery-600:#379947;--spectrum-global-color-celery-700:#318b40;--spectrum-global-color-chartreuse-400:#85d044;--spectrum-global-color-chartreuse-500:#7cc33f;--spectrum-global-color-chartreuse-600:#73b53a;--spectrum-global-color-chartreuse-700:#6aa834;--spectrum-global-color-yellow-400:#dfbf00;--spectrum-global-color-yellow-500:#d2b200;--spectrum-global-color-yellow-600:#c4a600;--spectrum-global-color-yellow-700:#b79900;--spectrum-global-color-magenta-400:#d83790;--spectrum-global-color-magenta-500:#ce2783;--spectrum-global-color-magenta-600:#bc1c74;--spectrum-global-color-magenta-700:#ae0e66;--spectrum-global-color-fuchsia-400:#c038cc;--spectrum-global-color-fuchsia-500:#b130bd;--spectrum-global-color-fuchsia-600:#a228ad;--spectrum-global-color-fuchsia-700:#93219e;--spectrum-global-color-purple-400:#9256d9;--spectrum-global-color-purple-500:#864ccc;--spectrum-global-color-purple-600:#7a42bf;--spectrum-global-color-purple-700:#6f38b1;--spectrum-global-color-indigo-400:#6767ec;--spectrum-global-color-indigo-500:#5c5ce0;--spectrum-global-color-indigo-600:#5151d3;--spectrum-global-color-indigo-700:#4646c6;--spectrum-global-color-seafoam-400:#1b959a;--spectrum-global-color-seafoam-500:#16878c;--spectrum-global-color-seafoam-600:#0f797d;--spectrum-global-color-seafoam-700:#096c6f;--spectrum-global-color-red-400:#e34850;--spectrum-global-color-red-500:#d7373f;--spectrum-global-color-red-600:#c9252d;--spectrum-global-color-red-700:#bb121a;--spectrum-global-color-orange-400:#e68619;--spectrum-global-color-orange-500:#da7b11;--spectrum-global-color-orange-600:#cb6f10;--spectrum-global-color-orange-700:#bd640d;--spectrum-global-color-green-400:#2d9d78;--spectrum-global-color-green-500:#268e6c;--spectrum-global-color-green-600:#12805c;--spectrum-global-color-green-700:#107154;--spectrum-global-color-blue-400:#2680eb;--spectrum-global-color-blue-500:#1473e6;--spectrum-global-color-blue-600:#0d66d0;--spectrum-global-color-blue-700:#095aba;--spectrum-global-color-gray-50:#fff;--spectrum-global-color-gray-75:#fafafa;--spectrum-global-color-gray-100:#f5f5f5;--spectrum-global-color-gray-200:#eaeaea;--spectrum-global-color-gray-300:#e1e1e1;--spectrum-global-color-gray-400:#cacaca;--spectrum-global-color-gray-500:#b3b3b3;--spectrum-global-color-gray-600:#8e8e8e;--spectrum-global-color-gray-700:#6e6e6e;--spectrum-global-color-gray-800:#4b4b4b;--spectrum-global-color-gray-900:#2c2c2c;--spectrum-alias-background-color-modal-overlay:rgba(0,0,0,0.4);--spectrum-alias-dropshadow-color:rgba(0,0,0,0.15);--spectrum-alias-background-color-hover-overlay:rgba(44,44,44,0.04);--spectrum-alias-highlight-hover:rgba(44,44,44,0.06);--spectrum-alias-highlight-active:rgba(44,44,44,0.1);--spectrum-alias-highlight-selected:rgba(20,115,230,0.1);--spectrum-alias-highlight-selected-hover:rgba(20,115,230,0.2);--spectrum-alias-text-highlight-color:rgba(20,115,230,0.2);--spectrum-alias-background-color-quickactions:hsla(0,0%,96.1%,0.9);--spectrum-alias-radial-reaction-color-default:rgba(75,75,75,0.6);--spectrum-alias-pasteboard-background-color:var(--spectrum-global-color-gray-300);--spectrum-alias-appframe-border-color:var(--spectrum-global-color-gray-300);--spectrum-alias-appframe-separator-color:var(--spectrum-global-color-gray-300);--spectrum-colorarea-border-color:rgba(44,44,44,0.1);--spectrum-colorarea-border-color-hover:rgba(44,44,44,0.1);--spectrum-colorarea-border-color-down:rgba(44,44,44,0.1);--spectrum-colorarea-border-color-key-focus:rgba(44,44,44,0.1);--spectrum-colorslider-border-color:rgba(44,44,44,0.1);--spectrum-colorslider-border-color-hover:rgba(44,44,44,0.1);--spectrum-colorslider-border-color-down:rgba(44,44,44,0.1);--spectrum-colorslider-border-color-key-focus:rgba(44,44,44,0.1);--spectrum-colorslider-vertical-border-color:rgba(44,44,44,0.1);--spectrum-colorslider-vertical-border-color-hover:rgba(44,44,44,0.1);--spectrum-colorslider-vertical-border-color-down:rgba(44,44,44,0.1);--spectrum-colorslider-vertical-border-color-key-focus:rgba(44,44,44,0.1);--spectrum-colorwheel-border-color:rgba(44,44,44,0.1);--spectrum-colorwheel-border-color-hover:rgba(44,44,44,0.1);--spectrum-colorwheel-border-color-down:rgba(44,44,44,0.1);--spectrum-colorwheel-border-color-key-focus:rgba(44,44,44,0.1);--spectrum-miller-column-item-background-color-selected:rgba(20,115,230,0.1);--spectrum-miller-column-item-background-color-selected-hover:rgba(20,115,230,0.2);--spectrum-tabs-compact-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-compact-vertical-rule-color:var(--spectrum-global-color-gray-200);--spectrum-tabs-compact-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-compact-vertical-emphasized-rule-color:var(--spectrum-global-color-gray-200);--spectrum-tabs-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-compact-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-compact-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-well-background-color:rgba(75,75,75,0.02);--spectrum-well-border-color:rgba(44,44,44,0.05);--spectrum-tray-background-color:var(--spectrum-global-color-gray-50)}
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
Theme.registerThemeFragment('light', 'color', styles$1);

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
const styles$2 = css `
:host,:root{--spectrum-global-color-status:Verified;--spectrum-global-color-version:5.1;--spectrum-global-color-celery-400:#4bc35f;--spectrum-global-color-celery-500:#44b556;--spectrum-global-color-celery-600:#3da74e;--spectrum-global-color-celery-700:#379947;--spectrum-global-color-chartreuse-400:#8ede49;--spectrum-global-color-chartreuse-500:#85d044;--spectrum-global-color-chartreuse-600:#7cc33f;--spectrum-global-color-chartreuse-700:#73b53a;--spectrum-global-color-yellow-400:#edcc00;--spectrum-global-color-yellow-500:#dfbf00;--spectrum-global-color-yellow-600:#d2b200;--spectrum-global-color-yellow-700:#c4a600;--spectrum-global-color-magenta-400:#e2499d;--spectrum-global-color-magenta-500:#d83790;--spectrum-global-color-magenta-600:#ca2982;--spectrum-global-color-magenta-700:#bc1c74;--spectrum-global-color-fuchsia-400:#cf3edc;--spectrum-global-color-fuchsia-500:#c038cc;--spectrum-global-color-fuchsia-600:#b130bd;--spectrum-global-color-fuchsia-700:#a228ad;--spectrum-global-color-purple-400:#9d64e1;--spectrum-global-color-purple-500:#9256d9;--spectrum-global-color-purple-600:#864ccc;--spectrum-global-color-purple-700:#7a42bf;--spectrum-global-color-indigo-400:#7575f1;--spectrum-global-color-indigo-500:#6767ec;--spectrum-global-color-indigo-600:#5c5ce0;--spectrum-global-color-indigo-700:#5151d3;--spectrum-global-color-seafoam-400:#20a3a8;--spectrum-global-color-seafoam-500:#1b959a;--spectrum-global-color-seafoam-600:#16878c;--spectrum-global-color-seafoam-700:#0f797d;--spectrum-global-color-red-400:#ec5b62;--spectrum-global-color-red-500:#e34850;--spectrum-global-color-red-600:#d7373f;--spectrum-global-color-red-700:#c9252d;--spectrum-global-color-orange-400:#f29423;--spectrum-global-color-orange-500:#e68619;--spectrum-global-color-orange-600:#da7b11;--spectrum-global-color-orange-700:#cb6f10;--spectrum-global-color-green-400:#33ab84;--spectrum-global-color-green-500:#2d9d78;--spectrum-global-color-green-600:#268e6c;--spectrum-global-color-green-700:#12805c;--spectrum-global-color-blue-400:#378ef0;--spectrum-global-color-blue-500:#2680eb;--spectrum-global-color-blue-600:#1473e6;--spectrum-global-color-blue-700:#0d66d0;--spectrum-global-color-gray-50:#fff;--spectrum-global-color-gray-75:#fff;--spectrum-global-color-gray-100:#fff;--spectrum-global-color-gray-200:#f4f4f4;--spectrum-global-color-gray-300:#eaeaea;--spectrum-global-color-gray-400:#d3d3d3;--spectrum-global-color-gray-500:#bcbcbc;--spectrum-global-color-gray-600:#959595;--spectrum-global-color-gray-700:#747474;--spectrum-global-color-gray-800:#505050;--spectrum-global-color-gray-900:#323232;--spectrum-alias-background-color-modal-overlay:rgba(0,0,0,0.4);--spectrum-alias-dropshadow-color:rgba(0,0,0,0.15);--spectrum-alias-background-color-hover-overlay:rgba(50,50,50,0.04);--spectrum-alias-highlight-hover:rgba(50,50,50,0.06);--spectrum-alias-highlight-active:rgba(50,50,50,0.1);--spectrum-alias-highlight-selected:rgba(38,128,235,0.1);--spectrum-alias-highlight-selected-hover:rgba(38,128,235,0.2);--spectrum-alias-text-highlight-color:rgba(38,128,235,0.2);--spectrum-alias-background-color-quickactions:hsla(0,0%,100%,0.9);--spectrum-alias-radial-reaction-color-default:rgba(80,80,80,0.6);--spectrum-alias-pasteboard-background-color:var(--spectrum-global-color-gray-300);--spectrum-alias-appframe-border-color:var(--spectrum-global-color-gray-300);--spectrum-alias-appframe-separator-color:var(--spectrum-global-color-gray-300);--spectrum-tabs-compact-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-compact-vertical-rule-color:var(--spectrum-global-color-gray-200);--spectrum-tabs-compact-vertical-emphasized-rule-color:var(--spectrum-global-color-gray-200);--spectrum-tabs-compact-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-compact-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-compact-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-colorarea-border-color:rgba(50,50,50,0.1);--spectrum-colorarea-border-color-hover:rgba(50,50,50,0.1);--spectrum-colorarea-border-color-down:rgba(50,50,50,0.1);--spectrum-colorarea-border-color-key-focus:rgba(50,50,50,0.1);--spectrum-colorslider-border-color:rgba(50,50,50,0.1);--spectrum-colorslider-border-color-hover:rgba(50,50,50,0.1);--spectrum-colorslider-border-color-down:rgba(50,50,50,0.1);--spectrum-colorslider-border-color-key-focus:rgba(50,50,50,0.1);--spectrum-colorslider-vertical-border-color:rgba(50,50,50,0.1);--spectrum-colorslider-vertical-border-color-hover:rgba(50,50,50,0.1);--spectrum-colorslider-vertical-border-color-down:rgba(50,50,50,0.1);--spectrum-colorslider-vertical-border-color-key-focus:rgba(50,50,50,0.1);--spectrum-colorwheel-border-color:rgba(50,50,50,0.1);--spectrum-colorwheel-border-color-hover:rgba(50,50,50,0.1);--spectrum-colorwheel-border-color-down:rgba(50,50,50,0.1);--spectrum-colorwheel-border-color-key-focus:rgba(50,50,50,0.1);--spectrum-miller-column-item-background-color-selected:rgba(38,128,235,0.1);--spectrum-miller-column-item-background-color-selected-hover:rgba(38,128,235,0.2);--spectrum-well-background-color:rgba(80,80,80,0.02);--spectrum-well-border-color:rgba(50,50,50,0.05)}
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
Theme.registerThemeFragment('lightest', 'color', styles$2);

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
const styles$3 = css `
:host,:root{--spectrum-global-color-status:Verified;--spectrum-global-color-version:5.1;--spectrum-global-color-celery-400:#44b556;--spectrum-global-color-celery-500:#4bc35f;--spectrum-global-color-celery-600:#51d267;--spectrum-global-color-celery-700:#58e06f;--spectrum-global-color-chartreuse-400:#85d044;--spectrum-global-color-chartreuse-500:#8ede49;--spectrum-global-color-chartreuse-600:#9bec54;--spectrum-global-color-chartreuse-700:#a3f858;--spectrum-global-color-yellow-400:#dfbf00;--spectrum-global-color-yellow-500:#edcc00;--spectrum-global-color-yellow-600:#fad900;--spectrum-global-color-yellow-700:#ffe22e;--spectrum-global-color-magenta-400:#d83790;--spectrum-global-color-magenta-500:#e2499d;--spectrum-global-color-magenta-600:#ec5aaa;--spectrum-global-color-magenta-700:#f56bb7;--spectrum-global-color-fuchsia-400:#c038cc;--spectrum-global-color-fuchsia-500:#cf3edc;--spectrum-global-color-fuchsia-600:#d951e5;--spectrum-global-color-fuchsia-700:#e366ef;--spectrum-global-color-purple-400:#9256d9;--spectrum-global-color-purple-500:#9d64e1;--spectrum-global-color-purple-600:#a873e9;--spectrum-global-color-purple-700:#b483f0;--spectrum-global-color-indigo-400:#6767ec;--spectrum-global-color-indigo-500:#7575f1;--spectrum-global-color-indigo-600:#8282f6;--spectrum-global-color-indigo-700:#9090fa;--spectrum-global-color-seafoam-400:#1b959a;--spectrum-global-color-seafoam-500:#20a3a8;--spectrum-global-color-seafoam-600:#23b2b8;--spectrum-global-color-seafoam-700:#26c0c7;--spectrum-global-color-red-400:#e34850;--spectrum-global-color-red-500:#ec5b62;--spectrum-global-color-red-600:#f76d74;--spectrum-global-color-red-700:#ff7b82;--spectrum-global-color-orange-400:#e68619;--spectrum-global-color-orange-500:#f29423;--spectrum-global-color-orange-600:#f9a43f;--spectrum-global-color-orange-700:#ffb55b;--spectrum-global-color-green-400:#2d9d78;--spectrum-global-color-green-500:#33ab84;--spectrum-global-color-green-600:#39b990;--spectrum-global-color-green-700:#3fc89c;--spectrum-global-color-blue-400:#2680eb;--spectrum-global-color-blue-500:#378ef0;--spectrum-global-color-blue-600:#4b9cf5;--spectrum-global-color-blue-700:#5aa9fa;--spectrum-global-color-gray-50:#252525;--spectrum-global-color-gray-75:#2f2f2f;--spectrum-global-color-gray-100:#323232;--spectrum-global-color-gray-200:#3e3e3e;--spectrum-global-color-gray-300:#4a4a4a;--spectrum-global-color-gray-400:#5a5a5a;--spectrum-global-color-gray-500:#6e6e6e;--spectrum-global-color-gray-600:#909090;--spectrum-global-color-gray-700:#b9b9b9;--spectrum-global-color-gray-800:#e3e3e3;--spectrum-global-color-gray-900:#fff;--spectrum-alias-background-color-modal-overlay:rgba(0,0,0,0.5);--spectrum-alias-dropshadow-color:rgba(0,0,0,0.5);--spectrum-alias-background-color-hover-overlay:hsla(0,0%,100%,0.06);--spectrum-alias-highlight-hover:hsla(0,0%,100%,0.07);--spectrum-alias-highlight-active:hsla(0,0%,100%,0.1);--spectrum-alias-highlight-selected:rgba(55,142,240,0.15);--spectrum-alias-highlight-selected-hover:rgba(55,142,240,0.25);--spectrum-alias-text-highlight-color:rgba(55,142,240,0.25);--spectrum-alias-background-color-quickactions:rgba(50,50,50,0.9);--spectrum-alias-radial-reaction-color-default:hsla(0,0%,89%,0.6);--spectrum-alias-pasteboard-background-color:var(--spectrum-global-color-gray-50);--spectrum-alias-appframe-border-color:var(--spectrum-global-color-gray-50);--spectrum-alias-appframe-separator-color:var(--spectrum-global-color-gray-50);--spectrum-colorarea-border-color:hsla(0,0%,100%,0.1);--spectrum-colorarea-border-color-hover:hsla(0,0%,100%,0.1);--spectrum-colorarea-border-color-down:hsla(0,0%,100%,0.1);--spectrum-colorarea-border-color-key-focus:hsla(0,0%,100%,0.1);--spectrum-colorslider-border-color:hsla(0,0%,100%,0.1);--spectrum-colorslider-border-color-hover:hsla(0,0%,100%,0.1);--spectrum-colorslider-border-color-down:hsla(0,0%,100%,0.1);--spectrum-colorslider-border-color-key-focus:hsla(0,0%,100%,0.1);--spectrum-colorslider-vertical-border-color:hsla(0,0%,100%,0.1);--spectrum-colorslider-vertical-border-color-hover:hsla(0,0%,100%,0.1);--spectrum-colorslider-vertical-border-color-down:hsla(0,0%,100%,0.1);--spectrum-colorslider-vertical-border-color-key-focus:hsla(0,0%,100%,0.1);--spectrum-colorwheel-border-color:hsla(0,0%,100%,0.1);--spectrum-colorwheel-border-color-hover:hsla(0,0%,100%,0.1);--spectrum-colorwheel-border-color-down:hsla(0,0%,100%,0.1);--spectrum-colorwheel-border-color-key-focus:hsla(0,0%,100%,0.1);--spectrum-miller-column-item-background-color-selected:rgba(55,142,240,0.1);--spectrum-miller-column-item-background-color-selected-hover:rgba(55,142,240,0.2);--spectrum-tabs-compact-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-compact-vertical-rule-color:var(--spectrum-global-color-gray-200);--spectrum-tabs-compact-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-compact-vertical-emphasized-rule-color:var(--spectrum-global-color-gray-200);--spectrum-tabs-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-compact-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-compact-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tray-background-color:var(--spectrum-global-color-gray-100);--spectrum-well-background-color:hsla(0,0%,89%,0.02);--spectrum-well-border-color:hsla(0,0%,100%,0.05)}
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
Theme.registerThemeFragment('dark', 'color', styles$3);

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
const styles$4 = css `
:host,:root{--spectrum-global-color-status:Verified;--spectrum-global-color-version:5.1;--spectrum-global-color-celery-400:#3da74e;--spectrum-global-color-celery-500:#44b556;--spectrum-global-color-celery-600:#4bc35f;--spectrum-global-color-celery-700:#51d267;--spectrum-global-color-chartreuse-400:#7cc33f;--spectrum-global-color-chartreuse-500:#85d044;--spectrum-global-color-chartreuse-600:#8ede49;--spectrum-global-color-chartreuse-700:#9bec54;--spectrum-global-color-yellow-400:#d2b200;--spectrum-global-color-yellow-500:#dfbf00;--spectrum-global-color-yellow-600:#edcc00;--spectrum-global-color-yellow-700:#fad900;--spectrum-global-color-magenta-400:#ca2996;--spectrum-global-color-magenta-500:#d83790;--spectrum-global-color-magenta-600:#e2499d;--spectrum-global-color-magenta-700:#ec5aaa;--spectrum-global-color-fuchsia-400:#b130bd;--spectrum-global-color-fuchsia-500:#c038cc;--spectrum-global-color-fuchsia-600:#cf3edc;--spectrum-global-color-fuchsia-700:#d951e5;--spectrum-global-color-purple-400:#864ccc;--spectrum-global-color-purple-500:#9256d9;--spectrum-global-color-purple-600:#9d64e1;--spectrum-global-color-purple-700:#a873df;--spectrum-global-color-indigo-400:#5c5ce0;--spectrum-global-color-indigo-500:#6767ec;--spectrum-global-color-indigo-600:#7575f1;--spectrum-global-color-indigo-700:#8282f6;--spectrum-global-color-seafoam-400:#16878c;--spectrum-global-color-seafoam-500:#1b959a;--spectrum-global-color-seafoam-600:#20a3a8;--spectrum-global-color-seafoam-700:#23b2b8;--spectrum-global-color-red-400:#d7373f;--spectrum-global-color-red-500:#e34850;--spectrum-global-color-red-600:#ec5b62;--spectrum-global-color-red-700:#f76d74;--spectrum-global-color-orange-400:#da7b11;--spectrum-global-color-orange-500:#e68619;--spectrum-global-color-orange-600:#f29423;--spectrum-global-color-orange-700:#f9a43f;--spectrum-global-color-green-400:#268e6c;--spectrum-global-color-green-500:#2d9d78;--spectrum-global-color-green-600:#33ab84;--spectrum-global-color-green-700:#39b990;--spectrum-global-color-blue-400:#1473e6;--spectrum-global-color-blue-500:#2680eb;--spectrum-global-color-blue-600:#378ef0;--spectrum-global-color-blue-700:#4b9cf5;--spectrum-global-color-gray-50:#080808;--spectrum-global-color-gray-75:#1a1a1a;--spectrum-global-color-gray-100:#1e1e1e;--spectrum-global-color-gray-200:#2c2c2c;--spectrum-global-color-gray-300:#393939;--spectrum-global-color-gray-400:#494949;--spectrum-global-color-gray-500:#5c5c5c;--spectrum-global-color-gray-600:#7c7c7c;--spectrum-global-color-gray-700:#a2a2a2;--spectrum-global-color-gray-800:#c8c8c8;--spectrum-global-color-gray-900:#efefef;--spectrum-alias-background-color-modal-overlay:rgba(0,0,0,0.6);--spectrum-alias-dropshadow-color:rgba(0,0,0,0.8);--spectrum-alias-background-color-hover-overlay:hsla(0,0%,93.7%,0.08);--spectrum-alias-highlight-hover:hsla(0,0%,93.7%,0.08);--spectrum-alias-highlight-active:hsla(0,0%,93.7%,0.15);--spectrum-alias-highlight-selected:rgba(38,128,235,0.2);--spectrum-alias-highlight-selected-hover:rgba(38,128,235,0.3);--spectrum-alias-text-highlight-color:rgba(38,128,235,0.3);--spectrum-alias-background-color-quickactions:rgba(30,30,30,0.9);--spectrum-alias-radial-reaction-color-default:hsla(0,0%,78.4%,0.6);--spectrum-alias-pasteboard-background-color:var(--spectrum-global-color-gray-50);--spectrum-alias-appframe-border-color:var(--spectrum-global-color-gray-50);--spectrum-alias-appframe-separator-color:var(--spectrum-global-color-gray-50);--spectrum-colorarea-border-color:hsla(0,0%,93.7%,0.1);--spectrum-colorarea-border-color-hover:hsla(0,0%,93.7%,0.1);--spectrum-colorarea-border-color-down:hsla(0,0%,93.7%,0.1);--spectrum-colorarea-border-color-key-focus:hsla(0,0%,93.7%,0.1);--spectrum-colorslider-border-color:hsla(0,0%,93.7%,0.1);--spectrum-colorslider-border-color-hover:hsla(0,0%,93.7%,0.1);--spectrum-colorslider-border-color-down:hsla(0,0%,93.7%,0.1);--spectrum-colorslider-border-color-key-focus:hsla(0,0%,93.7%,0.1);--spectrum-colorslider-vertical-border-color:hsla(0,0%,93.7%,0.1);--spectrum-colorslider-vertical-border-color-hover:hsla(0,0%,93.7%,0.1);--spectrum-colorslider-vertical-border-color-down:hsla(0,0%,93.7%,0.1);--spectrum-colorslider-vertical-border-color-key-focus:hsla(0,0%,93.7%,0.1);--spectrum-colorwheel-border-color:hsla(0,0%,93.7%,0.1);--spectrum-colorwheel-border-color-hover:hsla(0,0%,93.7%,0.1);--spectrum-colorwheel-border-color-down:hsla(0,0%,93.7%,0.1);--spectrum-colorwheel-border-color-key-focus:hsla(0,0%,93.7%,0.1);--spectrum-miller-column-item-background-color-selected:rgba(38,128,235,0.1);--spectrum-miller-column-item-background-color-selected-hover:rgba(38,128,235,0.2);--spectrum-tabs-compact-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-compact-vertical-rule-color:var(--spectrum-global-color-gray-200);--spectrum-tabs-compact-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-compact-vertical-emphasized-rule-color:var(--spectrum-global-color-gray-200);--spectrum-tabs-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-compact-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-compact-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-tabs-quiet-vertical-emphasized-selection-indicator-color:var(--spectrum-global-color-blue-500);--spectrum-well-background-color:hsla(0,0%,78.4%,0.02);--spectrum-well-border-color:hsla(0,0%,93.7%,0.05)}
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
Theme.registerThemeFragment('darkest', 'color', styles$4);

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
const styles$5 = css `
:host,:root{--spectrum-global-dimension-scale-factor:1;--spectrum-global-dimension-size-0:0px;--spectrum-global-dimension-size-10:1px;--spectrum-global-dimension-size-25:2px;--spectrum-global-dimension-size-40:3px;--spectrum-global-dimension-size-50:4px;--spectrum-global-dimension-size-65:5px;--spectrum-global-dimension-size-75:6px;--spectrum-global-dimension-size-85:7px;--spectrum-global-dimension-size-100:8px;--spectrum-global-dimension-size-115:9px;--spectrum-global-dimension-size-125:10px;--spectrum-global-dimension-size-130:11px;--spectrum-global-dimension-size-150:12px;--spectrum-global-dimension-size-160:13px;--spectrum-global-dimension-size-175:14px;--spectrum-global-dimension-size-200:16px;--spectrum-global-dimension-size-225:18px;--spectrum-global-dimension-size-250:20px;--spectrum-global-dimension-size-300:24px;--spectrum-global-dimension-size-350:28px;--spectrum-global-dimension-size-400:32px;--spectrum-global-dimension-size-450:36px;--spectrum-global-dimension-size-500:40px;--spectrum-global-dimension-size-550:44px;--spectrum-global-dimension-size-600:48px;--spectrum-global-dimension-size-675:54px;--spectrum-global-dimension-size-700:56px;--spectrum-global-dimension-size-800:64px;--spectrum-global-dimension-size-900:72px;--spectrum-global-dimension-size-1000:80px;--spectrum-global-dimension-size-1200:96px;--spectrum-global-dimension-size-1250:100px;--spectrum-global-dimension-size-1600:128px;--spectrum-global-dimension-size-1700:136px;--spectrum-global-dimension-size-2000:160px;--spectrum-global-dimension-size-2400:192px;--spectrum-global-dimension-size-3000:240px;--spectrum-global-dimension-size-3400:272px;--spectrum-global-dimension-size-3600:288px;--spectrum-global-dimension-size-4600:368px;--spectrum-global-dimension-size-5000:400px;--spectrum-global-dimension-size-6000:480px;--spectrum-global-dimension-font-size-25:10px;--spectrum-global-dimension-font-size-50:11px;--spectrum-global-dimension-font-size-75:12px;--spectrum-global-dimension-font-size-100:14px;--spectrum-global-dimension-font-size-150:15px;--spectrum-global-dimension-font-size-200:16px;--spectrum-global-dimension-font-size-300:18px;--spectrum-global-dimension-font-size-400:20px;--spectrum-global-dimension-font-size-500:22px;--spectrum-global-dimension-font-size-600:25px;--spectrum-global-dimension-font-size-700:28px;--spectrum-global-dimension-font-size-800:32px;--spectrum-global-dimension-font-size-900:36px;--spectrum-global-dimension-font-size-1000:40px;--spectrum-global-dimension-font-size-1100:45px;--spectrum-global-dimension-font-size-1200:50px;--spectrum-global-dimension-font-size-1300:60px;--spectrum-actionbutton-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-actionbutton-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-actionbutton-emphasized-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-actionbutton-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-actionbutton-quiet-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-actionbutton-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-actionbutton-quiet-emphasized-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-actionbutton-quiet-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-barloader-large-border-radius:3px;--spectrum-barloader-large-indeterminate-border-radius:3px;--spectrum-barloader-large-over-background-border-radius:3px;--spectrum-barloader-small-border-radius:var(--spectrum-global-dimension-static-size-25);--spectrum-barloader-small-indeterminate-border-radius:var(--spectrum-global-dimension-static-size-25);--spectrum-barloader-small-over-background-border-radius:var(--spectrum-global-dimension-static-size-25);--spectrum-breadcrumb-compact-item-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-breadcrumb-compact-button-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-breadcrumb-item-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-breadcrumb-button-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-breadcrumb-multiline-item-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-breadcrumb-multiline-button-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-button-cta-text-padding-bottom:var(--spectrum-global-dimension-size-85);--spectrum-button-cta-min-width:var(--spectrum-global-dimension-size-900);--spectrum-button-cta-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-button-cta-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-button-over-background-text-padding-bottom:var(--spectrum-global-dimension-size-85);--spectrum-button-over-background-min-width:var(--spectrum-global-dimension-size-900);--spectrum-button-over-background-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-button-over-background-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-button-primary-text-padding-bottom:var(--spectrum-global-dimension-size-85);--spectrum-button-primary-min-width:var(--spectrum-global-dimension-size-900);--spectrum-button-primary-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-button-primary-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-button-quiet-over-background-text-padding-bottom:var(--spectrum-global-dimension-size-85);--spectrum-button-quiet-over-background-min-width:var(--spectrum-global-dimension-size-900);--spectrum-button-quiet-over-background-touch-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-button-quiet-over-background-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-button-quiet-over-background-cursor-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-button-quiet-primary-text-padding-bottom:var(--spectrum-global-dimension-size-85);--spectrum-button-quiet-primary-min-width:var(--spectrum-global-dimension-size-900);--spectrum-button-quiet-primary-touch-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-button-quiet-primary-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-button-quiet-primary-cursor-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-button-quiet-secondary-text-padding-bottom:var(--spectrum-global-dimension-size-85);--spectrum-button-quiet-secondary-min-width:var(--spectrum-global-dimension-size-900);--spectrum-button-quiet-secondary-touch-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-button-quiet-secondary-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-button-quiet-secondary-cursor-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-button-quiet-warning-text-padding-bottom:var(--spectrum-global-dimension-size-85);--spectrum-button-quiet-warning-min-width:var(--spectrum-global-dimension-size-900);--spectrum-button-quiet-warning-touch-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-button-quiet-warning-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-button-quiet-warning-cursor-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-button-secondary-text-padding-bottom:var(--spectrum-global-dimension-size-85);--spectrum-button-secondary-min-width:var(--spectrum-global-dimension-size-900);--spectrum-button-secondary-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-button-secondary-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-button-warning-text-padding-bottom:var(--spectrum-global-dimension-size-85);--spectrum-button-warning-min-width:var(--spectrum-global-dimension-size-900);--spectrum-button-warning-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-button-warning-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-checkbox-text-gap-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-text-gap-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-text-gap-error-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-checkbox-emphasized-text-gap-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-emphasized-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-emphasized-text-gap-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-emphasized-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-emphasized-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-emphasized-text-gap-error-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-checkbox-quiet-text-gap-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-quiet-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-quiet-text-gap-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-quiet-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-quiet-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-quiet-text-gap-error-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-checkbox-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-circleloader-medium-border-size:3px;--spectrum-circleloader-medium-over-background-border-size:3px;--spectrum-circleloader-small-border-size:var(--spectrum-global-dimension-static-size-25);--spectrum-circleloader-small-over-background-border-size:var(--spectrum-global-dimension-static-size-25);--spectrum-colorhandle-loupe-margin:var(--spectrum-global-dimension-static-size-125);--spectrum-colorloupe-colorhandle-gap:var(--spectrum-global-dimension-static-size-125);--spectrum-colorslider-touch-hit-y:var(--spectrum-global-dimension-size-150);--spectrum-colorslider-vertical-touch-hit-x:var(--spectrum-global-dimension-size-150);--spectrum-colorwheel-min-size:var(--spectrum-global-dimension-size-2400);--spectrum-colorwheel-touch-hit-outer:var(--spectrum-global-dimension-size-150);--spectrum-colorwheel-touch-hit-inner:var(--spectrum-global-dimension-size-150);--spectrum-cyclebutton-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-cyclebutton-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-dialog-confirm-max-width:var(--spectrum-global-dimension-static-size-6000);--spectrum-dialog-confirm-title-text-size:var(--spectrum-global-dimension-font-size-300);--spectrum-dialog-confirm-description-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-dialog-confirm-padding:var(--spectrum-global-dimension-static-size-500);--spectrum-dialog-confirm-description-margin-bottom:var(--spectrum-global-dimension-static-size-600);--spectrum-dialog-max-width:var(--spectrum-global-dimension-static-size-6000);--spectrum-dialog-title-text-size:var(--spectrum-global-dimension-font-size-300);--spectrum-dialog-content-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-dialog-padding:var(--spectrum-global-dimension-static-size-500);--spectrum-dialog-content-margin-bottom:var(--spectrum-global-dimension-static-size-600);--spectrum-dialog-destructive-max-width:var(--spectrum-global-dimension-static-size-6000);--spectrum-dialog-destructive-title-text-size:var(--spectrum-global-dimension-font-size-300);--spectrum-dialog-destructive-description-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-dialog-destructive-padding:var(--spectrum-global-dimension-static-size-500);--spectrum-dialog-destructive-description-margin-bottom:var(--spectrum-global-dimension-static-size-600);--spectrum-dialog-error-max-width:var(--spectrum-global-dimension-static-size-6000);--spectrum-dialog-error-title-text-size:var(--spectrum-global-dimension-font-size-300);--spectrum-dialog-error-description-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-dialog-error-padding:var(--spectrum-global-dimension-static-size-500);--spectrum-dialog-error-description-margin-bottom:var(--spectrum-global-dimension-static-size-600);--spectrum-dialog-info-max-width:var(--spectrum-global-dimension-static-size-6000);--spectrum-dialog-info-title-text-size:var(--spectrum-global-dimension-font-size-300);--spectrum-dialog-info-description-text-size:var(--spectrum-global-dimension-font-size-100);--spectrum-dialog-info-padding:var(--spectrum-global-dimension-static-size-500);--spectrum-dialog-info-description-margin-bottom:var(--spectrum-global-dimension-static-size-600);--spectrum-dropdown-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-dropdown-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-dropdown-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-400);--spectrum-dropdown-thumbnail-small-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-dropdown-thumbnail-small-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-fieldbutton-quiet-min-width:var(--spectrum-global-dimension-size-225);--spectrum-icon-arrow-down-small-height:var(--spectrum-global-dimension-size-125);--spectrum-icon-arrow-left-medium-height:var(--spectrum-global-dimension-size-125);--spectrum-icon-checkmark-medium-width:var(--spectrum-global-dimension-size-150);--spectrum-icon-checkmark-medium-height:var(--spectrum-global-dimension-size-150);--spectrum-icon-checkmark-small-width:var(--spectrum-global-dimension-size-125);--spectrum-icon-checkmark-small-height:var(--spectrum-global-dimension-size-125);--spectrum-icon-chevron-down-medium-width:var(--spectrum-global-dimension-size-125);--spectrum-icon-chevron-left-large-width:var(--spectrum-global-dimension-size-150);--spectrum-icon-chevron-left-medium-height:var(--spectrum-global-dimension-size-125);--spectrum-icon-chevron-right-large-width:var(--spectrum-global-dimension-size-150);--spectrum-icon-chevron-right-medium-height:var(--spectrum-global-dimension-size-125);--spectrum-icon-cross-large-width:var(--spectrum-global-dimension-size-150);--spectrum-icon-cross-large-height:var(--spectrum-global-dimension-size-150);--spectrum-icon-dash-small-width:var(--spectrum-global-dimension-size-125);--spectrum-icon-dash-small-height:var(--spectrum-global-dimension-size-125);--spectrum-icon-skip-left-width:9px;--spectrum-icon-skip-left-height:var(--spectrum-global-dimension-size-125);--spectrum-icon-skip-right-width:9px;--spectrum-icon-skip-right-height:var(--spectrum-global-dimension-size-125);--spectrum-icon-triplegripper-width:var(--spectrum-global-dimension-size-125);--spectrum-listitem-option-icon-size:var(--spectrum-global-dimension-static-size-150);--spectrum-listitem-option-icon-margin-top:var(--spectrum-global-dimension-static-size-65);--spectrum-listitem-option-height:var(--spectrum-global-dimension-static-size-400);--spectrum-listitem-option-icon-padding-y:var(--spectrum-global-dimension-static-size-125);--spectrum-listitem-thumbnail-option-icon-margin-top:var(--spectrum-global-dimension-static-size-65);--spectrum-listitem-thumbnail-option-icon-padding-y:var(--spectrum-global-dimension-static-size-125);--spectrum-selectlist-thumbnail-small-option-icon-margin-top:var(--spectrum-global-dimension-static-size-65);--spectrum-selectlist-thumbnail-small-option-icon-padding-y:var(--spectrum-global-dimension-static-size-125);--spectrum-selectlist-option-icon-size:var(--spectrum-global-dimension-static-size-150);--spectrum-selectlist-option-icon-padding-y:var(--spectrum-global-dimension-static-size-125);--spectrum-selectlist-option-icon-margin-top:var(--spectrum-global-dimension-static-size-65);--spectrum-selectlist-option-height:var(--spectrum-global-dimension-static-size-400);--spectrum-selectlist-thumbnail-option-icon-padding-y:var(--spectrum-global-dimension-static-size-125);--spectrum-loader-bar-large-border-radius:3px;--spectrum-loader-bar-large-over-background-border-radius:3px;--spectrum-loader-bar-small-border-radius:var(--spectrum-global-dimension-static-size-25);--spectrum-loader-bar-small-over-background-border-radius:var(--spectrum-global-dimension-static-size-25);--spectrum-loader-circle-medium-border-size:3px;--spectrum-loader-circle-medium-over-background-border-size:3px;--spectrum-loader-circle-small-border-size:var(--spectrum-global-dimension-static-size-25);--spectrum-loader-circle-small-over-background-border-size:var(--spectrum-global-dimension-static-size-25);--spectrum-meter-large-border-radius:3px;--spectrum-meter-small-border-radius:var(--spectrum-global-dimension-static-size-25);--spectrum-pagination-page-button-line-height:26px;--spectrum-picker-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-picker-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-picker-quiet-min-width:var(--spectrum-global-dimension-size-225);--spectrum-picker-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-400);--spectrum-picker-thumbnail-small-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-picker-thumbnail-small-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-progressbar-large-border-radius:3px;--spectrum-progressbar-large-indeterminate-border-radius:3px;--spectrum-progressbar-large-over-background-border-radius:3px;--spectrum-progressbar-small-border-radius:var(--spectrum-global-dimension-static-size-25);--spectrum-progressbar-small-indeterminate-border-radius:var(--spectrum-global-dimension-static-size-25);--spectrum-progressbar-small-over-background-border-radius:var(--spectrum-global-dimension-static-size-25);--spectrum-progresscircle-medium-border-size:3px;--spectrum-progresscircle-medium-over-background-border-size:3px;--spectrum-progresscircle-small-border-size:var(--spectrum-global-dimension-static-size-25);--spectrum-progresscircle-small-indeterminate-border-size:var(--spectrum-global-dimension-static-size-25);--spectrum-progresscircle-small-over-background-border-size:var(--spectrum-global-dimension-static-size-25);--spectrum-progresscircle-medium-indeterminate-border-size:3px;--spectrum-radio-text-gap-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-margin-bottom:0px;--spectrum-radio-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-radio-emphasized-text-gap-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-emphasized-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-emphasized-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-emphasized-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-emphasized-margin-bottom:0px;--spectrum-radio-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-radio-quiet-text-gap-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-quiet-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-quiet-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-quiet-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-radio-quiet-margin-bottom:0px;--spectrum-radio-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-rating-icon-width:24px;--spectrum-rating-indicator-width:16px;--spectrum-rating-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-rating-emphasized-icon-width:24px;--spectrum-rating-emphasized-indicator-width:16px;--spectrum-rating-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-rating-quiet-icon-width:24px;--spectrum-rating-quiet-indicator-width:16px;--spectrum-rating-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-search-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-search-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-search-icon-frame:var(--spectrum-global-dimension-static-size-400);--spectrum-search-quiet-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-search-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-search-quiet-icon-frame:var(--spectrum-global-dimension-static-size-400);--spectrum-sidenav-item-touch-hit-bottom:var(--spectrum-global-dimension-static-size-25);--spectrum-sidenav-multilevel-item-touch-hit-bottom:var(--spectrum-global-dimension-static-size-25);--spectrum-slider-track-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-slider-handle-touch-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-slider-handle-touch-hit-y:var(--spectrum-global-dimension-static-size-200);--spectrum-slider-editable-track-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-slider-editable-handle-touch-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-slider-editable-handle-touch-hit-y:var(--spectrum-global-dimension-static-size-200);--spectrum-slider-fill-track-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-slider-fill-handle-touch-hit-x:var(--spectrum-global-dimension-static-size-200);--spectrum-slider-fill-handle-touch-hit-y:var(--spectrum-global-dimension-static-size-200);--spectrum-switch-focus-ring-border-radius-key-focus:var(--spectrum-global-dimension-static-size-130);--spectrum-switch-text-gap-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-track-width:26px;--spectrum-switch-handle-border-radius:7px;--spectrum-switch-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-switch-emphasized-focus-ring-border-radius-key-focus:var(--spectrum-global-dimension-static-size-130);--spectrum-switch-emphasized-text-gap-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-emphasized-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-emphasized-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-emphasized-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-emphasized-track-width:26px;--spectrum-switch-emphasized-handle-border-radius:7px;--spectrum-switch-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-switch-quiet-focus-ring-border-radius-key-focus:var(--spectrum-global-dimension-static-size-130);--spectrum-switch-quiet-text-gap-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-quiet-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-quiet-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-quiet-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-115);--spectrum-switch-quiet-track-width:26px;--spectrum-switch-quiet-handle-border-radius:7px;--spectrum-switch-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-tabs-compact-focus-ring-border-radius:5px;--spectrum-tabs-compact-margin-left:-8px;--spectrum-tabs-compact-margin-right:-8px;--spectrum-tabs-compact-vertical-focus-ring-border-radius:5px;--spectrum-tabs-compact-vertical-emphasized-focus-ring-border-radius:5px;--spectrum-tabs-baseline:var(--spectrum-global-dimension-size-225);--spectrum-tabs-focus-ring-border-radius:5px;--spectrum-tabs-margin-left:-8px;--spectrum-tabs-margin-right:-8px;--spectrum-tabs-emphasized-baseline:var(--spectrum-global-dimension-size-225);--spectrum-tabs-emphasized-focus-ring-border-radius:5px;--spectrum-tabs-emphasized-margin-left:-8px;--spectrum-tabs-emphasized-margin-right:-8px;--spectrum-tabs-quiet-baseline:var(--spectrum-global-dimension-size-225);--spectrum-tabs-quiet-focus-ring-border-radius:5px;--spectrum-tabs-quiet-margin-left:-8px;--spectrum-tabs-quiet-margin-right:-8px;--spectrum-tabs-quiet-compact-focus-ring-border-radius:5px;--spectrum-tabs-quiet-compact-margin-left:-8px;--spectrum-tabs-quiet-compact-margin-right:-8px;--spectrum-tabs-quiet-compact-emphasized-focus-ring-border-radius:5px;--spectrum-tabs-quiet-compact-emphasized-margin-left:-8px;--spectrum-tabs-quiet-compact-emphasized-margin-right:-8px;--spectrum-tabs-quiet-compact-vertical-focus-ring-border-radius:5px;--spectrum-tabs-quiet-compact-vertical-emphasized-focus-ring-border-radius:5px;--spectrum-tabs-quiet-emphasized-baseline:var(--spectrum-global-dimension-size-225);--spectrum-tabs-quiet-emphasized-focus-ring-border-radius:5px;--spectrum-tabs-quiet-emphasized-margin-left:-8px;--spectrum-tabs-quiet-emphasized-margin-right:-8px;--spectrum-tabs-quiet-vertical-baseline:var(--spectrum-global-dimension-size-225);--spectrum-tabs-quiet-vertical-focus-ring-border-radius:5px;--spectrum-tabs-quiet-vertical-emphasized-baseline:var(--spectrum-global-dimension-size-225);--spectrum-tabs-quiet-vertical-emphasized-focus-ring-border-radius:5px;--spectrum-tabs-vertical-baseline:var(--spectrum-global-dimension-size-225);--spectrum-tabs-vertical-focus-ring-border-radius:5px;--spectrum-textarea-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-textarea-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-textarea-icon-frame:var(--spectrum-global-dimension-static-size-400);--spectrum-textarea-quiet-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-textarea-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-textarea-quiet-icon-frame:var(--spectrum-global-dimension-static-size-400);--spectrum-textfield-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-textfield-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-textfield-icon-frame:var(--spectrum-global-dimension-static-size-400);--spectrum-textfield-quiet-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-textfield-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-textfield-quiet-icon-frame:var(--spectrum-global-dimension-static-size-400);--spectrum-tool-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-tool-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-tool-high-emphasis-touch-hit-x:var(--spectrum-global-dimension-static-size-100);--spectrum-tool-high-emphasis-touch-hit-y:var(--spectrum-global-dimension-static-size-100);--spectrum-tooltip-padding-bottom:5px;--spectrum-tooltip-content-max-width:101px;--spectrum-tooltip-info-padding-bottom:5px;--spectrum-tooltip-info-content-max-width:101px;--spectrum-tooltip-negative-padding-bottom:5px;--spectrum-tooltip-negative-content-max-width:101px;--spectrum-tooltip-positive-padding-bottom:5px;--spectrum-tooltip-positive-content-max-width:101px}
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
Theme.registerThemeFragment('medium', 'scale', styles$5);

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
const styles$6 = css `
:host,:root{--spectrum-global-dimension-scale-factor:1.25;--spectrum-global-dimension-size-0:0px;--spectrum-global-dimension-size-10:1px;--spectrum-global-dimension-size-25:2px;--spectrum-global-dimension-size-40:4px;--spectrum-global-dimension-size-50:5px;--spectrum-global-dimension-size-65:6px;--spectrum-global-dimension-size-75:8px;--spectrum-global-dimension-size-85:9px;--spectrum-global-dimension-size-100:10px;--spectrum-global-dimension-size-115:11px;--spectrum-global-dimension-size-125:13px;--spectrum-global-dimension-size-130:14px;--spectrum-global-dimension-size-150:15px;--spectrum-global-dimension-size-160:16px;--spectrum-global-dimension-size-175:18px;--spectrum-global-dimension-size-200:20px;--spectrum-global-dimension-size-225:22px;--spectrum-global-dimension-size-250:25px;--spectrum-global-dimension-size-300:30px;--spectrum-global-dimension-size-350:35px;--spectrum-global-dimension-size-400:40px;--spectrum-global-dimension-size-450:45px;--spectrum-global-dimension-size-500:50px;--spectrum-global-dimension-size-550:56px;--spectrum-global-dimension-size-600:60px;--spectrum-global-dimension-size-675:68px;--spectrum-global-dimension-size-700:70px;--spectrum-global-dimension-size-800:80px;--spectrum-global-dimension-size-900:90px;--spectrum-global-dimension-size-1000:100px;--spectrum-global-dimension-size-1200:120px;--spectrum-global-dimension-size-1250:125px;--spectrum-global-dimension-size-1600:160px;--spectrum-global-dimension-size-1700:170px;--spectrum-global-dimension-size-2000:200px;--spectrum-global-dimension-size-2400:240px;--spectrum-global-dimension-size-3000:300px;--spectrum-global-dimension-size-3400:340px;--spectrum-global-dimension-size-3600:360px;--spectrum-global-dimension-size-4600:460px;--spectrum-global-dimension-size-5000:500px;--spectrum-global-dimension-size-6000:600px;--spectrum-global-dimension-font-size-25:12px;--spectrum-global-dimension-font-size-50:13px;--spectrum-global-dimension-font-size-75:15px;--spectrum-global-dimension-font-size-100:17px;--spectrum-global-dimension-font-size-150:18px;--spectrum-global-dimension-font-size-200:19px;--spectrum-global-dimension-font-size-300:22px;--spectrum-global-dimension-font-size-400:24px;--spectrum-global-dimension-font-size-500:27px;--spectrum-global-dimension-font-size-600:31px;--spectrum-global-dimension-font-size-700:34px;--spectrum-global-dimension-font-size-800:39px;--spectrum-global-dimension-font-size-900:44px;--spectrum-global-dimension-font-size-1000:49px;--spectrum-global-dimension-font-size-1100:55px;--spectrum-global-dimension-font-size-1200:62px;--spectrum-global-dimension-font-size-1300:70px;--spectrum-actionbutton-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-actionbutton-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-actionbutton-emphasized-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-actionbutton-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-actionbutton-quiet-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-actionbutton-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-actionbutton-quiet-emphasized-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-actionbutton-quiet-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-barloader-large-border-radius:4px;--spectrum-barloader-large-indeterminate-border-radius:4px;--spectrum-barloader-large-over-background-border-radius:4px;--spectrum-barloader-small-border-radius:3px;--spectrum-barloader-small-indeterminate-border-radius:3px;--spectrum-barloader-small-over-background-border-radius:3px;--spectrum-breadcrumb-compact-item-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-breadcrumb-compact-button-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-breadcrumb-item-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-breadcrumb-button-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-breadcrumb-multiline-item-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-breadcrumb-multiline-button-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-button-cta-text-padding-bottom:var(--spectrum-global-dimension-size-100);--spectrum-button-cta-min-width:90px;--spectrum-button-cta-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-button-cta-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-button-over-background-text-padding-bottom:var(--spectrum-global-dimension-size-100);--spectrum-button-over-background-min-width:90px;--spectrum-button-over-background-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-button-over-background-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-button-primary-text-padding-bottom:var(--spectrum-global-dimension-size-100);--spectrum-button-primary-min-width:90px;--spectrum-button-primary-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-button-primary-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-button-quiet-over-background-text-padding-bottom:var(--spectrum-global-dimension-size-100);--spectrum-button-quiet-over-background-min-width:90px;--spectrum-button-quiet-over-background-touch-hit-x:var(--spectrum-global-dimension-static-size-250);--spectrum-button-quiet-over-background-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-button-quiet-over-background-cursor-hit-x:var(--spectrum-global-dimension-static-size-250);--spectrum-button-quiet-primary-text-padding-bottom:var(--spectrum-global-dimension-size-100);--spectrum-button-quiet-primary-min-width:90px;--spectrum-button-quiet-primary-touch-hit-x:var(--spectrum-global-dimension-static-size-250);--spectrum-button-quiet-primary-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-button-quiet-primary-cursor-hit-x:var(--spectrum-global-dimension-static-size-250);--spectrum-button-quiet-secondary-text-padding-bottom:var(--spectrum-global-dimension-size-100);--spectrum-button-quiet-secondary-min-width:90px;--spectrum-button-quiet-secondary-touch-hit-x:var(--spectrum-global-dimension-static-size-250);--spectrum-button-quiet-secondary-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-button-quiet-secondary-cursor-hit-x:var(--spectrum-global-dimension-static-size-250);--spectrum-button-quiet-warning-text-padding-bottom:var(--spectrum-global-dimension-size-100);--spectrum-button-quiet-warning-min-width:90px;--spectrum-button-quiet-warning-touch-hit-x:var(--spectrum-global-dimension-static-size-250);--spectrum-button-quiet-warning-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-button-quiet-warning-cursor-hit-x:var(--spectrum-global-dimension-static-size-250);--spectrum-button-secondary-text-padding-bottom:var(--spectrum-global-dimension-size-100);--spectrum-button-secondary-min-width:90px;--spectrum-button-secondary-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-button-secondary-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-button-warning-text-padding-bottom:var(--spectrum-global-dimension-size-100);--spectrum-button-warning-min-width:90px;--spectrum-button-warning-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-button-warning-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-checkbox-text-gap-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-text-gap-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-text-gap-error-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-checkbox-emphasized-text-gap-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-emphasized-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-emphasized-text-gap-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-emphasized-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-emphasized-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-emphasized-text-gap-error-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-checkbox-quiet-text-gap-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-quiet-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-quiet-text-gap-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-quiet-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-quiet-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-quiet-text-gap-error-indeterminate-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-checkbox-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-circleloader-medium-border-size:var(--spectrum-global-dimension-static-size-50);--spectrum-circleloader-medium-over-background-border-size:var(--spectrum-global-dimension-static-size-50);--spectrum-circleloader-small-border-size:3px;--spectrum-circleloader-small-over-background-border-size:3px;--spectrum-colorhandle-loupe-margin:var(--spectrum-global-dimension-static-size-100);--spectrum-colorloupe-colorhandle-gap:var(--spectrum-global-dimension-static-size-100);--spectrum-colorslider-touch-hit-y:var(--spectrum-global-dimension-size-85);--spectrum-colorslider-vertical-touch-hit-x:var(--spectrum-global-dimension-size-85);--spectrum-colorwheel-min-size:var(--spectrum-global-dimension-static-size-2600);--spectrum-colorwheel-touch-hit-outer:var(--spectrum-global-dimension-size-85);--spectrum-colorwheel-touch-hit-inner:var(--spectrum-global-dimension-size-85);--spectrum-cyclebutton-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-cyclebutton-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-dialog-confirm-max-width:var(--spectrum-global-dimension-static-size-5000);--spectrum-dialog-confirm-title-text-size:var(--spectrum-global-dimension-font-size-200);--spectrum-dialog-confirm-description-text-size:var(--spectrum-global-dimension-font-size-75);--spectrum-dialog-confirm-padding:var(--spectrum-global-dimension-static-size-300);--spectrum-dialog-confirm-description-margin-bottom:var(--spectrum-global-dimension-static-size-500);--spectrum-dialog-max-width:var(--spectrum-global-dimension-static-size-5000);--spectrum-dialog-title-text-size:var(--spectrum-global-dimension-font-size-200);--spectrum-dialog-content-text-size:var(--spectrum-global-dimension-font-size-75);--spectrum-dialog-padding:var(--spectrum-global-dimension-static-size-300);--spectrum-dialog-content-margin-bottom:var(--spectrum-global-dimension-static-size-500);--spectrum-dialog-destructive-max-width:var(--spectrum-global-dimension-static-size-5000);--spectrum-dialog-destructive-title-text-size:var(--spectrum-global-dimension-font-size-200);--spectrum-dialog-destructive-description-text-size:var(--spectrum-global-dimension-font-size-75);--spectrum-dialog-destructive-padding:var(--spectrum-global-dimension-static-size-300);--spectrum-dialog-destructive-description-margin-bottom:var(--spectrum-global-dimension-static-size-500);--spectrum-dialog-error-max-width:var(--spectrum-global-dimension-static-size-5000);--spectrum-dialog-error-title-text-size:var(--spectrum-global-dimension-font-size-200);--spectrum-dialog-error-description-text-size:var(--spectrum-global-dimension-font-size-75);--spectrum-dialog-error-padding:var(--spectrum-global-dimension-static-size-300);--spectrum-dialog-error-description-margin-bottom:var(--spectrum-global-dimension-static-size-500);--spectrum-dialog-info-max-width:var(--spectrum-global-dimension-static-size-5000);--spectrum-dialog-info-title-text-size:var(--spectrum-global-dimension-font-size-200);--spectrum-dialog-info-description-text-size:var(--spectrum-global-dimension-font-size-75);--spectrum-dialog-info-padding:var(--spectrum-global-dimension-static-size-300);--spectrum-dialog-info-description-margin-bottom:var(--spectrum-global-dimension-static-size-500);--spectrum-dropdown-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-dropdown-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-dropdown-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-dropdown-thumbnail-small-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-dropdown-thumbnail-small-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-fieldbutton-quiet-min-width:var(--spectrum-global-dimension-size-200);--spectrum-icon-arrow-down-small-height:12px;--spectrum-icon-arrow-left-medium-height:12px;--spectrum-icon-checkmark-medium-width:16px;--spectrum-icon-checkmark-medium-height:16px;--spectrum-icon-checkmark-small-width:12px;--spectrum-icon-checkmark-small-height:12px;--spectrum-icon-chevron-down-medium-width:12px;--spectrum-icon-chevron-left-large-width:16px;--spectrum-icon-chevron-left-medium-height:12px;--spectrum-icon-chevron-right-large-width:16px;--spectrum-icon-chevron-right-medium-height:12px;--spectrum-icon-cross-large-width:16px;--spectrum-icon-cross-large-height:16px;--spectrum-icon-dash-small-width:12px;--spectrum-icon-dash-small-height:12px;--spectrum-icon-skip-left-width:10px;--spectrum-icon-skip-left-height:12px;--spectrum-icon-skip-right-width:10px;--spectrum-icon-skip-right-height:12px;--spectrum-icon-triplegripper-width:12px;--spectrum-listitem-option-icon-size:var(--spectrum-global-dimension-static-size-200);--spectrum-listitem-option-icon-margin-top:var(--spectrum-global-dimension-static-size-50);--spectrum-listitem-option-height:var(--spectrum-global-dimension-static-size-600);--spectrum-listitem-option-icon-padding-y:var(--spectrum-global-dimension-static-size-200);--spectrum-listitem-thumbnail-option-icon-margin-top:var(--spectrum-global-dimension-static-size-50);--spectrum-listitem-thumbnail-option-icon-padding-y:var(--spectrum-global-dimension-static-size-200);--spectrum-selectlist-thumbnail-small-option-icon-margin-top:var(--spectrum-global-dimension-static-size-50);--spectrum-selectlist-thumbnail-small-option-icon-padding-y:var(--spectrum-global-dimension-static-size-200);--spectrum-selectlist-option-icon-size:var(--spectrum-global-dimension-static-size-200);--spectrum-selectlist-option-icon-padding-y:var(--spectrum-global-dimension-static-size-200);--spectrum-selectlist-option-icon-margin-top:var(--spectrum-global-dimension-static-size-50);--spectrum-selectlist-option-height:var(--spectrum-global-dimension-static-size-600);--spectrum-selectlist-thumbnail-option-icon-padding-y:var(--spectrum-global-dimension-static-size-200);--spectrum-loader-bar-large-border-radius:4px;--spectrum-loader-bar-large-over-background-border-radius:4px;--spectrum-loader-bar-small-border-radius:3px;--spectrum-loader-bar-small-over-background-border-radius:3px;--spectrum-loader-circle-medium-border-size:var(--spectrum-global-dimension-static-size-50);--spectrum-loader-circle-medium-over-background-border-size:var(--spectrum-global-dimension-static-size-50);--spectrum-loader-circle-small-border-size:3px;--spectrum-loader-circle-small-over-background-border-size:3px;--spectrum-meter-large-border-radius:4px;--spectrum-meter-small-border-radius:3px;--spectrum-pagination-page-button-line-height:32px;--spectrum-picker-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-picker-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-picker-quiet-min-width:var(--spectrum-global-dimension-size-200);--spectrum-picker-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-picker-thumbnail-small-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-picker-thumbnail-small-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-progressbar-large-border-radius:4px;--spectrum-progressbar-large-indeterminate-border-radius:4px;--spectrum-progressbar-large-over-background-border-radius:4px;--spectrum-progressbar-small-border-radius:3px;--spectrum-progressbar-small-indeterminate-border-radius:3px;--spectrum-progressbar-small-over-background-border-radius:3px;--spectrum-progresscircle-medium-border-size:var(--spectrum-global-dimension-static-size-50);--spectrum-progresscircle-medium-over-background-border-size:var(--spectrum-global-dimension-static-size-50);--spectrum-progresscircle-small-border-size:3px;--spectrum-progresscircle-small-indeterminate-border-size:3px;--spectrum-progresscircle-small-over-background-border-size:3px;--spectrum-progresscircle-medium-indeterminate-border-size:var(--spectrum-global-dimension-static-size-50);--spectrum-radio-text-gap-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-margin-bottom:var(--spectrum-global-dimension-static-size-100);--spectrum-radio-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-radio-emphasized-text-gap-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-emphasized-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-emphasized-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-emphasized-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-emphasized-margin-bottom:var(--spectrum-global-dimension-static-size-100);--spectrum-radio-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-radio-quiet-text-gap-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-quiet-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-quiet-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-quiet-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-radio-quiet-margin-bottom:var(--spectrum-global-dimension-static-size-100);--spectrum-radio-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-rating-icon-width:30px;--spectrum-rating-indicator-width:20px;--spectrum-rating-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-rating-emphasized-icon-width:30px;--spectrum-rating-emphasized-indicator-width:20px;--spectrum-rating-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-rating-quiet-icon-width:30px;--spectrum-rating-quiet-indicator-width:20px;--spectrum-rating-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-search-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-search-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-search-icon-frame:var(--spectrum-global-dimension-static-size-500);--spectrum-search-quiet-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-search-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-search-quiet-icon-frame:var(--spectrum-global-dimension-static-size-500);--spectrum-sidenav-item-touch-hit-bottom:3px;--spectrum-sidenav-multilevel-item-touch-hit-bottom:3px;--spectrum-slider-track-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-slider-handle-touch-hit-x:var(--spectrum-global-dimension-static-size-175);--spectrum-slider-handle-touch-hit-y:var(--spectrum-global-dimension-static-size-175);--spectrum-slider-editable-track-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-slider-editable-handle-touch-hit-x:var(--spectrum-global-dimension-static-size-175);--spectrum-slider-editable-handle-touch-hit-y:var(--spectrum-global-dimension-static-size-175);--spectrum-slider-fill-track-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-slider-fill-handle-touch-hit-x:var(--spectrum-global-dimension-static-size-175);--spectrum-slider-fill-handle-touch-hit-y:var(--spectrum-global-dimension-static-size-175);--spectrum-switch-focus-ring-border-radius-key-focus:var(--spectrum-global-dimension-static-size-160);--spectrum-switch-text-gap-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-track-width:var(--spectrum-global-dimension-static-size-450);--spectrum-switch-handle-border-radius:9px;--spectrum-switch-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-switch-emphasized-focus-ring-border-radius-key-focus:var(--spectrum-global-dimension-static-size-160);--spectrum-switch-emphasized-text-gap-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-emphasized-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-emphasized-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-emphasized-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-emphasized-track-width:var(--spectrum-global-dimension-static-size-450);--spectrum-switch-emphasized-handle-border-radius:9px;--spectrum-switch-emphasized-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-switch-quiet-focus-ring-border-radius-key-focus:var(--spectrum-global-dimension-static-size-160);--spectrum-switch-quiet-text-gap-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-quiet-text-gap-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-quiet-text-gap-error-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-quiet-text-gap-error-selected-key-focus:var(--spectrum-global-dimension-static-size-150);--spectrum-switch-quiet-track-width:var(--spectrum-global-dimension-static-size-450);--spectrum-switch-quiet-handle-border-radius:9px;--spectrum-switch-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-tabs-compact-focus-ring-border-radius:6px;--spectrum-tabs-compact-margin-left:-11px;--spectrum-tabs-compact-margin-right:-11px;--spectrum-tabs-compact-vertical-focus-ring-border-radius:6px;--spectrum-tabs-compact-vertical-emphasized-focus-ring-border-radius:6px;--spectrum-tabs-baseline:var(--spectrum-global-dimension-size-250);--spectrum-tabs-focus-ring-border-radius:6px;--spectrum-tabs-margin-left:-11px;--spectrum-tabs-margin-right:-11px;--spectrum-tabs-emphasized-baseline:var(--spectrum-global-dimension-size-250);--spectrum-tabs-emphasized-focus-ring-border-radius:6px;--spectrum-tabs-emphasized-margin-left:-11px;--spectrum-tabs-emphasized-margin-right:-11px;--spectrum-tabs-quiet-baseline:var(--spectrum-global-dimension-size-250);--spectrum-tabs-quiet-focus-ring-border-radius:6px;--spectrum-tabs-quiet-margin-left:-11px;--spectrum-tabs-quiet-margin-right:-11px;--spectrum-tabs-quiet-compact-focus-ring-border-radius:6px;--spectrum-tabs-quiet-compact-margin-left:-11px;--spectrum-tabs-quiet-compact-margin-right:-11px;--spectrum-tabs-quiet-compact-emphasized-focus-ring-border-radius:6px;--spectrum-tabs-quiet-compact-emphasized-margin-left:-11px;--spectrum-tabs-quiet-compact-emphasized-margin-right:-11px;--spectrum-tabs-quiet-compact-vertical-focus-ring-border-radius:6px;--spectrum-tabs-quiet-compact-vertical-emphasized-focus-ring-border-radius:6px;--spectrum-tabs-quiet-emphasized-baseline:var(--spectrum-global-dimension-size-250);--spectrum-tabs-quiet-emphasized-focus-ring-border-radius:6px;--spectrum-tabs-quiet-emphasized-margin-left:-11px;--spectrum-tabs-quiet-emphasized-margin-right:-11px;--spectrum-tabs-quiet-vertical-baseline:var(--spectrum-global-dimension-size-250);--spectrum-tabs-quiet-vertical-focus-ring-border-radius:6px;--spectrum-tabs-quiet-vertical-emphasized-baseline:var(--spectrum-global-dimension-size-250);--spectrum-tabs-quiet-vertical-emphasized-focus-ring-border-radius:6px;--spectrum-tabs-vertical-baseline:var(--spectrum-global-dimension-size-250);--spectrum-tabs-vertical-focus-ring-border-radius:6px;--spectrum-textarea-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-textarea-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-textarea-icon-frame:var(--spectrum-global-dimension-static-size-500);--spectrum-textarea-quiet-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-textarea-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-textarea-quiet-icon-frame:var(--spectrum-global-dimension-static-size-500);--spectrum-textfield-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-textfield-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-textfield-icon-frame:var(--spectrum-global-dimension-static-size-500);--spectrum-textfield-quiet-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-textfield-quiet-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-textfield-quiet-icon-frame:var(--spectrum-global-dimension-static-size-500);--spectrum-tool-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-tool-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-tool-high-emphasis-touch-hit-x:var(--spectrum-global-dimension-static-size-50);--spectrum-tool-high-emphasis-touch-hit-y:var(--spectrum-global-dimension-static-size-50);--spectrum-tooltip-padding-bottom:6px;--spectrum-tooltip-content-max-width:126px;--spectrum-tooltip-info-padding-bottom:6px;--spectrum-tooltip-info-content-max-width:126px;--spectrum-tooltip-negative-padding-bottom:6px;--spectrum-tooltip-negative-content-max-width:126px;--spectrum-tooltip-positive-padding-bottom:6px;--spectrum-tooltip-positive-content-max-width:126px}
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
Theme.registerThemeFragment('large', 'scale', styles$6);

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (factory());
}(undefined, (function () {
  /**
   * Applies the :focus-visible polyfill at the given scope.
   * A scope in this case is either the top-level Document or a Shadow Root.
   *
   * @param {(Document|ShadowRoot)} scope
   * @see https://github.com/WICG/focus-visible
   */
  function applyFocusVisiblePolyfill(scope) {
    var hadKeyboardEvent = true;
    var hadFocusVisibleRecently = false;
    var hadFocusVisibleRecentlyTimeout = null;

    var inputTypesAllowlist = {
      text: true,
      search: true,
      url: true,
      tel: true,
      email: true,
      password: true,
      number: true,
      date: true,
      month: true,
      week: true,
      time: true,
      datetime: true,
      'datetime-local': true
    };

    /**
     * Helper function for legacy browsers and iframes which sometimes focus
     * elements like document, body, and non-interactive SVG.
     * @param {Element} el
     */
    function isValidFocusTarget(el) {
      if (
        el &&
        el !== document &&
        el.nodeName !== 'HTML' &&
        el.nodeName !== 'BODY' &&
        'classList' in el &&
        'contains' in el.classList
      ) {
        return true;
      }
      return false;
    }

    /**
     * Computes whether the given element should automatically trigger the
     * `focus-visible` class being added, i.e. whether it should always match
     * `:focus-visible` when focused.
     * @param {Element} el
     * @return {boolean}
     */
    function focusTriggersKeyboardModality(el) {
      var type = el.type;
      var tagName = el.tagName;

      if (tagName === 'INPUT' && inputTypesAllowlist[type] && !el.readOnly) {
        return true;
      }

      if (tagName === 'TEXTAREA' && !el.readOnly) {
        return true;
      }

      if (el.isContentEditable) {
        return true;
      }

      return false;
    }

    /**
     * Add the `focus-visible` class to the given element if it was not added by
     * the author.
     * @param {Element} el
     */
    function addFocusVisibleClass(el) {
      if (el.classList.contains('focus-visible')) {
        return;
      }
      el.classList.add('focus-visible');
      el.setAttribute('data-focus-visible-added', '');
    }

    /**
     * Remove the `focus-visible` class from the given element if it was not
     * originally added by the author.
     * @param {Element} el
     */
    function removeFocusVisibleClass(el) {
      if (!el.hasAttribute('data-focus-visible-added')) {
        return;
      }
      el.classList.remove('focus-visible');
      el.removeAttribute('data-focus-visible-added');
    }

    /**
     * If the most recent user interaction was via the keyboard;
     * and the key press did not include a meta, alt/option, or control key;
     * then the modality is keyboard. Otherwise, the modality is not keyboard.
     * Apply `focus-visible` to any current active element and keep track
     * of our keyboard modality state with `hadKeyboardEvent`.
     * @param {KeyboardEvent} e
     */
    function onKeyDown(e) {
      if (e.metaKey || e.altKey || e.ctrlKey) {
        return;
      }

      if (isValidFocusTarget(scope.activeElement)) {
        addFocusVisibleClass(scope.activeElement);
      }

      hadKeyboardEvent = true;
    }

    /**
     * If at any point a user clicks with a pointing device, ensure that we change
     * the modality away from keyboard.
     * This avoids the situation where a user presses a key on an already focused
     * element, and then clicks on a different element, focusing it with a
     * pointing device, while we still think we're in keyboard modality.
     * @param {Event} e
     */
    function onPointerDown(e) {
      hadKeyboardEvent = false;
    }

    /**
     * On `focus`, add the `focus-visible` class to the target if:
     * - the target received focus as a result of keyboard navigation, or
     * - the event target is an element that will likely require interaction
     *   via the keyboard (e.g. a text box)
     * @param {Event} e
     */
    function onFocus(e) {
      // Prevent IE from focusing the document or HTML element.
      if (!isValidFocusTarget(e.target)) {
        return;
      }

      if (hadKeyboardEvent || focusTriggersKeyboardModality(e.target)) {
        addFocusVisibleClass(e.target);
      }
    }

    /**
     * On `blur`, remove the `focus-visible` class from the target.
     * @param {Event} e
     */
    function onBlur(e) {
      if (!isValidFocusTarget(e.target)) {
        return;
      }

      if (
        e.target.classList.contains('focus-visible') ||
        e.target.hasAttribute('data-focus-visible-added')
      ) {
        // To detect a tab/window switch, we look for a blur event followed
        // rapidly by a visibility change.
        // If we don't see a visibility change within 100ms, it's probably a
        // regular focus change.
        hadFocusVisibleRecently = true;
        window.clearTimeout(hadFocusVisibleRecentlyTimeout);
        hadFocusVisibleRecentlyTimeout = window.setTimeout(function() {
          hadFocusVisibleRecently = false;
        }, 100);
        removeFocusVisibleClass(e.target);
      }
    }

    /**
     * If the user changes tabs, keep track of whether or not the previously
     * focused element had .focus-visible.
     * @param {Event} e
     */
    function onVisibilityChange(e) {
      if (document.visibilityState === 'hidden') {
        // If the tab becomes active again, the browser will handle calling focus
        // on the element (Safari actually calls it twice).
        // If this tab change caused a blur on an element with focus-visible,
        // re-apply the class when the user switches back to the tab.
        if (hadFocusVisibleRecently) {
          hadKeyboardEvent = true;
        }
        addInitialPointerMoveListeners();
      }
    }

    /**
     * Add a group of listeners to detect usage of any pointing devices.
     * These listeners will be added when the polyfill first loads, and anytime
     * the window is blurred, so that they are active when the window regains
     * focus.
     */
    function addInitialPointerMoveListeners() {
      document.addEventListener('mousemove', onInitialPointerMove);
      document.addEventListener('mousedown', onInitialPointerMove);
      document.addEventListener('mouseup', onInitialPointerMove);
      document.addEventListener('pointermove', onInitialPointerMove);
      document.addEventListener('pointerdown', onInitialPointerMove);
      document.addEventListener('pointerup', onInitialPointerMove);
      document.addEventListener('touchmove', onInitialPointerMove);
      document.addEventListener('touchstart', onInitialPointerMove);
      document.addEventListener('touchend', onInitialPointerMove);
    }

    function removeInitialPointerMoveListeners() {
      document.removeEventListener('mousemove', onInitialPointerMove);
      document.removeEventListener('mousedown', onInitialPointerMove);
      document.removeEventListener('mouseup', onInitialPointerMove);
      document.removeEventListener('pointermove', onInitialPointerMove);
      document.removeEventListener('pointerdown', onInitialPointerMove);
      document.removeEventListener('pointerup', onInitialPointerMove);
      document.removeEventListener('touchmove', onInitialPointerMove);
      document.removeEventListener('touchstart', onInitialPointerMove);
      document.removeEventListener('touchend', onInitialPointerMove);
    }

    /**
     * When the polfyill first loads, assume the user is in keyboard modality.
     * If any event is received from a pointing device (e.g. mouse, pointer,
     * touch), turn off keyboard modality.
     * This accounts for situations where focus enters the page from the URL bar.
     * @param {Event} e
     */
    function onInitialPointerMove(e) {
      // Work around a Safari quirk that fires a mousemove on <html> whenever the
      // window blurs, even if you're tabbing out of the page. ¯\_(ツ)_/¯
      if (e.target.nodeName && e.target.nodeName.toLowerCase() === 'html') {
        return;
      }

      hadKeyboardEvent = false;
      removeInitialPointerMoveListeners();
    }

    // For some kinds of state, we are interested in changes at the global scope
    // only. For example, global pointer input, global key presses and global
    // visibility change should affect the state at every scope:
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('touchstart', onPointerDown, true);
    document.addEventListener('visibilitychange', onVisibilityChange, true);

    addInitialPointerMoveListeners();

    // For focus and blur, we specifically care about state changes in the local
    // scope. This is because focus / blur events that originate from within a
    // shadow root are not re-dispatched from the host element if it was already
    // the active element in its own scope:
    scope.addEventListener('focus', onFocus, true);
    scope.addEventListener('blur', onBlur, true);

    // We detect that a node is a ShadowRoot by ensuring that it is a
    // DocumentFragment and also has a host property. This check covers native
    // implementation and polyfill implementation transparently. If we only cared
    // about the native implementation, we could just check if the scope was
    // an instance of a ShadowRoot.
    if (scope.nodeType === Node.DOCUMENT_FRAGMENT_NODE && scope.host) {
      // Since a ShadowRoot is a special kind of DocumentFragment, it does not
      // have a root element to add a class to. So, we add this attribute to the
      // host element instead:
      scope.host.setAttribute('data-js-focus-visible', '');
    } else if (scope.nodeType === Node.DOCUMENT_NODE) {
      document.documentElement.classList.add('js-focus-visible');
      document.documentElement.setAttribute('data-js-focus-visible', '');
    }
  }

  // It is important to wrap all references to global window and document in
  // these checks to support server-side rendering use cases
  // @see https://github.com/WICG/focus-visible/issues/199
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Make the polyfill helper globally available. This can be used as a signal
    // to interested libraries that wish to coordinate with the polyfill for e.g.,
    // applying the polyfill to a shadow root:
    window.applyFocusVisiblePolyfill = applyFocusVisiblePolyfill;

    // Notify interested libraries of the polyfill's presence, in case the
    // polyfill was loaded lazily:
    var event;

    try {
      event = new CustomEvent('focus-visible-polyfill-ready');
    } catch (error) {
      // IE11 does not support using CustomEvent as a constructor directly:
      event = document.createEvent('CustomEvent');
      event.initCustomEvent('focus-visible-polyfill-ready', false, false, {});
    }

    window.dispatchEvent(event);
  }

  if (typeof document !== 'undefined') {
    // Apply the polyfill to the global document, so that no JavaScript
    // coordination is required to use the polyfill in the top-level document:
    applyFocusVisiblePolyfill(document);
  }

})));

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
 * This mixin function is designed to be applied to a class that inherits
 * from HTMLElement. It makes it easy for a custom element to coordinate with
 * the :focus-visible polyfill.
 *
 * NOTE(cdata): The code here was adapted from an example proposed with the
 * introduction of ShadowDOM support in the :focus-visible polyfill.
 *
 * @see https://github.com/WICG/focus-visible/pull/196
 * @param {Function} SuperClass The base class implementation to decorate with
 * implementation that coordinates with the :focus-visible polyfill
 */
const FocusVisiblePolyfillMixin = (SuperClass) => {
    var _a;
    const coordinateWithPolyfill = (instance) => {
        // If there is no shadow root, there is no need to coordinate with
        // the polyfill. If we already coordinated with the polyfill, we can
        // skip subsequent invokcations:
        if (instance.shadowRoot == null ||
            instance.hasAttribute('data-js-focus-visible')) {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            return () => { };
        }
        // The polyfill might already be loaded. If so, we can apply it to
        // the shadow root immediately:
        if (self.applyFocusVisiblePolyfill) {
            self.applyFocusVisiblePolyfill(instance.shadowRoot);
        }
        else {
            const coordinationHandler = () => {
                if (self.applyFocusVisiblePolyfill && instance.shadowRoot) {
                    self.applyFocusVisiblePolyfill(instance.shadowRoot);
                }
                if (instance.manageAutoFocus) {
                    instance.manageAutoFocus();
                }
            };
            // Otherwise, wait for the polyfill to be loaded lazily. It might
            // never be loaded, but if it is then we can apply it to the
            // shadow root at the appropriate time by waiting for the ready
            // event:
            self.addEventListener('focus-visible-polyfill-ready', coordinationHandler, { once: true });
            return () => {
                self.removeEventListener('focus-visible-polyfill-ready', coordinationHandler);
            };
        }
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return () => { };
    };
    const $endPolyfillCoordination = Symbol('endPolyfillCoordination');
    // IE11 doesn't natively support custom elements or JavaScript class
    // syntax The mixin implementation assumes that the user will take the
    // appropriate steps to support both:
    class FocusVisibleCoordinator extends SuperClass {
        constructor() {
            super(...arguments);
            this[_a] = null;
        }
        // Attempt to coordinate with the polyfill when connected to the
        // document:
        connectedCallback() {
            super.connectedCallback && super.connectedCallback();
            if (this[$endPolyfillCoordination] == null) {
                this[$endPolyfillCoordination] = coordinateWithPolyfill(this);
            }
        }
        disconnectedCallback() {
            super.disconnectedCallback && super.disconnectedCallback();
            // It's important to remove the polyfill event listener when we
            // disconnect, otherwise we will leak the whole element via window:
            if (this[$endPolyfillCoordination] != null) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this[$endPolyfillCoordination]();
                this[$endPolyfillCoordination] = null;
            }
        }
    }
    _a = $endPolyfillCoordination;
    return FocusVisibleCoordinator;
};

/**
 * Focusable base class handles tabindex setting into shadowed elements automatically.
 *
 * This implementation is based heavily on the aybolit delegate-focus-mixin at
 * https://github.com/web-padawan/aybolit/blob/master/packages/core/src/mixins/delegate-focus-mixin.js
 */
class Focusable extends FocusVisiblePolyfillMixin(SpectrumElement) {
    constructor() {
        super(...arguments);
        /**
         * Disable this control. It will not receive focus or events
         */
        this.disabled = false;
        /**
         * When this control is rendered, focus it automatically
         */
        this.autofocus = false;
        this.manipulatingTabindex = false;
    }
    /**
     * The tab index to apply to this control. See general documentation about
     * the tabindex HTML property
     */
    get tabIndex() {
        const tabIndexAttribute = parseFloat(this.hasAttribute('tabindex')
            ? this.getAttribute('tabindex') || '0'
            : '0');
        // When `disabled` tabindex is -1.
        // When host tabindex -1, use that as the cache.
        if (this.disabled || tabIndexAttribute < 0) {
            return -1;
        }
        // When `focusElement` isn't available yet,
        // use host tabindex as the cache.
        if (!this.focusElement) {
            return tabIndexAttribute;
        }
        // All other times, use the tabindex of `focusElement`
        // as the cache for this value.
        return this.focusElement.tabIndex;
    }
    set tabIndex(tabIndex) {
        // Flipping `manipulatingTabindex` to true before a change
        // allows for that change NOT to effect the cached value of tabindex
        if (this.manipulatingTabindex) {
            this.manipulatingTabindex = false;
            return;
        }
        // All code paths are about to address the host tabindex without side effect.
        this.manipulatingTabindex = true;
        if (tabIndex === -1 || this.disabled) {
            // Do not cange the tabindex of `focusElement` as it is the "old" value cache.
            // Make element NOT focusable.
            this.setAttribute('tabindex', '-1');
            this.removeAttribute('focusable');
            if (tabIndex !== -1) {
                // Cache all NON-`-1` values on the `focusElement`.
                this.manageFocusElementTabindex(tabIndex);
            }
            return;
        }
        this.setAttribute('focusable', '');
        if (this.hasAttribute('tabindex')) {
            this.removeAttribute('tabindex');
        }
        else {
            // You can't remove an attribute that isn't there,
            // manually end the `manipulatingTabindex` guard.
            this.manipulatingTabindex = false;
        }
        this.manageFocusElementTabindex(tabIndex);
    }
    async manageFocusElementTabindex(tabIndex) {
        if (!this.focusElement) {
            // allow setting these values to be async when needed.
            await this.updateComplete;
        }
        if (tabIndex === null) {
            this.focusElement.removeAttribute('tabindex');
        }
        else {
            this.focusElement.tabIndex = tabIndex;
        }
    }
    get focusElement() {
        throw new Error('Must implement focusElement getter!');
    }
    focus() {
        if (this.disabled || !this.focusElement) {
            return;
        }
        this.focusElement.focus();
    }
    blur() {
        this.focusElement.blur();
    }
    click() {
        if (this.disabled) {
            return;
        }
        this.focusElement.click();
    }
    manageAutoFocus() {
        if (this.autofocus) {
            /* Trick :focus-visible polyfill into thinking keyboard based focus */
            this.dispatchEvent(new KeyboardEvent('keydown', {
                code: 'Tab',
            }));
            this.focusElement.focus();
        }
    }
    firstUpdated(changes) {
        super.firstUpdated(changes);
        this.manageAutoFocus();
        if (!this.hasAttribute('tabindex') ||
            this.getAttribute('tabindex') !== '-1') {
            this.setAttribute('focusable', '');
        }
    }
    update(changedProperties) {
        if (changedProperties.has('disabled')) {
            this.handleDisabledChanged(this.disabled, changedProperties.get('disabled'));
        }
        super.update(changedProperties);
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('disabled')) {
            if (this.disabled) {
                this.blur();
            }
        }
    }
    async handleDisabledChanged(disabled, oldDisabled) {
        if (disabled) {
            this.manipulatingTabindex = true;
            this.setAttribute('tabindex', '-1');
            await this.updateComplete;
            if (typeof this.focusElement.disabled === 'undefined') {
                this.setAttribute('aria-disabled', 'true');
            }
            else {
                this.focusElement.disabled = true;
            }
        }
        else if (oldDisabled) {
            this.manipulatingTabindex = true;
            this.removeAttribute('tabindex');
            await this.updateComplete;
            if (typeof this.focusElement.disabled === 'undefined') {
                this.removeAttribute('aria-disabled');
            }
            else {
                this.focusElement.disabled = false;
            }
        }
    }
}
__decorate([
    property({ type: Boolean, reflect: true })
], Focusable.prototype, "disabled", void 0);
__decorate([
    property({ type: Boolean })
], Focusable.prototype, "autofocus", void 0);
__decorate([
    property({ type: Number })
], Focusable.prototype, "tabIndex", null);

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
const getActiveElement = (el) => {
    return el.getRootNode().activeElement;
};

function LikeAnchor(constructor) {
    class LikeAnchorElement extends constructor {
        renderAnchor({ id, className, 
        // prettier-ignore
        anchorContent = html `<slot></slot>` }) {
            // prettier-ignore
            return html `<a
                    id=${id}
                    class=${ifDefined(className)}
                    href=${ifDefined(this.href)}
                    download=${ifDefined(this.download)}
                    target=${ifDefined(this.target)}
                    aria-label=${ifDefined(this.label)}
                    rel=${ifDefined(this.rel)}
                >${anchorContent}</a>`;
        }
    }
    __decorate([
        property({ reflect: true })
    ], LikeAnchorElement.prototype, "download", void 0);
    __decorate([
        property()
    ], LikeAnchorElement.prototype, "label", void 0);
    __decorate([
        property({ reflect: true })
    ], LikeAnchorElement.prototype, "href", void 0);
    __decorate([
        property({ reflect: true })
    ], LikeAnchorElement.prototype, "target", void 0);
    __decorate([
        property({ reflect: true })
    ], LikeAnchorElement.prototype, "rel", void 0);
    return LikeAnchorElement;
}

const slotElementObserver = Symbol('slotElementObserver');
const startObserving = Symbol('startObserving');
function ObserveSlotPresence(constructor, lightDomSelector) {
    class SlotPresenceObservingElement extends constructor {
        constructor() {
            super(...arguments);
            this.slotContentIsPresent = false;
            this.managePresenceObservedSlot = () => {
                this.slotContentIsPresent = !!this.querySelector(lightDomSelector);
            };
        }
        [startObserving]() {
            const config = { childList: true, subtree: true };
            if (!this[slotElementObserver]) {
                this[slotElementObserver] = new MutationObserver(this.managePresenceObservedSlot);
            }
            this[slotElementObserver].observe(this, config);
            this.managePresenceObservedSlot();
        }
        connectedCallback() {
            super.connectedCallback();
            this[startObserving]();
        }
        disconnectedCallback() {
            this[slotElementObserver].disconnect();
            super.disconnectedCallback();
        }
    }
    __decorate([
        property({ type: Boolean, attribute: false })
    ], SlotPresenceObservingElement.prototype, "slotContentIsPresent", void 0);
    return SlotPresenceObservingElement;
}

const slotElementObserver$1 = Symbol('slotElementObserver');
const assignedNodesList = Symbol('assignedNodes');
const startObserving$1 = Symbol('startObserving');
function ObserveSlotText(constructor, slotSelector) {
    var _a;
    class SlotTextObservingElement extends constructor {
        constructor() {
            super(...arguments);
            this.slotHasContent = false;
        }
        manageTextObservedSlot() {
            if (!this[assignedNodesList])
                return;
            const assignedNodes = [...this[assignedNodesList]].filter((node) => {
                if (node.tagName) {
                    return true;
                }
                return node.textContent ? node.textContent.trim() : false;
            });
            this.slotHasContent = assignedNodes.length > 0;
        }
        firstUpdated(changedProperties) {
            super.firstUpdated(changedProperties);
            this.manageTextObservedSlot();
        }
        [(_a = assignedNodesList, startObserving$1)]() {
            const config = { characterData: true, subtree: true };
            if (!this[slotElementObserver$1]) {
                const callback = (mutationsList) => {
                    for (const mutation of mutationsList) {
                        if (mutation.type === 'characterData') {
                            this.manageTextObservedSlot();
                        }
                    }
                };
                this[slotElementObserver$1] = new MutationObserver(callback);
            }
            this[slotElementObserver$1].observe(this, config);
        }
        connectedCallback() {
            super.connectedCallback();
            this[startObserving$1]();
        }
        disconnectedCallback() {
            if (this[slotElementObserver$1]) {
                this[slotElementObserver$1].disconnect();
            }
            super.disconnectedCallback();
        }
    }
    __decorate([
        property({ type: Boolean, attribute: false })
    ], SlotTextObservingElement.prototype, "slotHasContent", void 0);
    __decorate([
        queryAssignedNodes(slotSelector, true)
    ], SlotTextObservingElement.prototype, _a, void 0);
    return SlotTextObservingElement;
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
const styles$7 = css `
:host{position:relative;box-sizing:border-box;height:calc(var(--spectrum-tabs-height, var(--spectrum-global-dimension-size-600)) - var(--spectrum-tabs-rule-height,
var(--spectrum-alias-border-size-thick)));line-height:calc(var(--spectrum-tabs-height, var(--spectrum-global-dimension-size-600)) - var(--spectrum-tabs-rule-height,
var(--spectrum-alias-border-size-thick)));z-index:1;text-decoration:none;white-space:nowrap;transition:color var(--spectrum-global-animation-duration-100,.13s) ease-out;cursor:pointer;outline:none;color:var(--spectrum-tabs-text-color,var(--spectrum-alias-label-text-color))}:host([disabled]),:host([disabled]) #itemLabel{cursor:default}::slotted([slot=icon]){height:calc(var(--spectrum-tabs-height, var(--spectrum-global-dimension-size-600)) - var(--spectrum-tabs-rule-height,
var(--spectrum-alias-border-size-thick)));color:var(--spectrum-tabs-icon-color,var(--spectrum-alias-icon-color))}:host([dir=ltr]) slot[name=icon]+#itemLabel{margin-left:calc(var(--spectrum-tabs-icon-gap, var(--spectrum-global-dimension-size-100)) - var(--spectrum-global-dimension-size-40))}:host([dir=rtl]) slot[name=icon]+#itemLabel{margin-right:calc(var(--spectrum-tabs-icon-gap, var(--spectrum-global-dimension-size-100)) - var(--spectrum-global-dimension-size-40))}:host([dir=ltr]):before{left:calc(-1*var(--spectrum-tabs-focus-ring-padding-x, var(--spectrum-global-dimension-size-100)))}:host([dir=ltr]):before,:host([dir=rtl]):before{right:calc(-1*var(--spectrum-tabs-focus-ring-padding-x, var(--spectrum-global-dimension-size-100)))}:host([dir=rtl]):before{left:calc(-1*var(--spectrum-tabs-focus-ring-padding-x, var(--spectrum-global-dimension-size-100)))}:host:before{content:"";position:absolute;top:50%;box-sizing:border-box;height:var(--spectrum-tabs-focus-ring-height,var(--spectrum-alias-single-line-height));margin-top:calc(var(--spectrum-tabs-focus-ring-height,
var(--spectrum-alias-single-line-height))/-2 + var(--spectrum-tabs-rule-height,
var(--spectrum-alias-border-size-thick))/2);border:var(--spectrum-tabs-focus-ring-size,var(--spectrum-alias-border-size-thick)) solid transparent;border-radius:var(--spectrum-tabs-focus-ring-border-radius);pointer-events:none}#itemLabel{cursor:pointer;vertical-align:top;display:inline-block;font-size:var(--spectrum-tabs-text-size,var(--spectrum-alias-font-size-default));font-weight:var(--spectrum-tabs-text-font-weight,var(--spectrum-alias-body-text-font-weight));text-decoration:none}#itemLabel:empty{display:none}:host(:hover){color:var(--spectrum-tabs-text-color-hover,var(--spectrum-alias-text-color-hover))}:host(:hover) ::slotted([slot=icon]){color:var(--spectrum-tabs-icon-color-hover,var(--spectrum-alias-icon-color-hover))}:host([selected]){color:var(--spectrum-tabs-text-color-selected,var(--spectrum-global-color-gray-900))}:host([selected]) ::slotted([slot=icon]){color:var(--spectrum-tabs-icon-color-selected,var(--spectrum-global-color-gray-900))}:host(.focus-visible){color:var(--spectrum-tabs-text-color-key-focus,var(--spectrum-alias-text-color-hover))}:host(.focus-visible):before{border-color:var(--spectrum-tabs-focus-ring-color,var(--spectrum-alias-border-color-focus))}:host(.focus-visible) ::slotted([slot=icon]){color:var(--spectrum-tabs-icon-color-key-focus,var(--spectrum-alias-icon-color-focus))}:host([disabled]){color:var(--spectrum-tabs-text-color-disabled,var(--spectrum-alias-text-color-disabled))}:host([disabled]) ::slotted([slot=icon]){color:var(--spectrum-tabs-icon-color-disabled,var(--spectrum-alias-icon-color-disabled))}:host([vertical]){display:flex;flex-direction:column;justify-content:center;align-items:center;height:var(--spectrum-tabs-vertical-item-height,auto)!important;--sp-tab-vertial-margin-y:calc((var(--spectrum-tabs-vertical-item-height,
var(--spectrum-global-dimension-size-550)) - var(--spectrum-tabs-focus-ring-height,
var(--spectrum-alias-single-line-height)))/2)}:host([vertical]):before{left:calc(-1*var(--spectrum-tabs-focus-ring-size, var(--spectrum-alias-border-size-thick)));right:calc(-1*var(--spectrum-tabs-focus-ring-size, var(--spectrum-alias-border-size-thick)));height:auto;margin-top:0;top:0;bottom:0}:host([vertical]) ::slotted([slot=icon]){margin-top:var(--sp-tab-vertial-margin-y);height:auto}:host([dir][vertical]) slot[name=icon]+#itemLabel{font-size:var(--spectrum-tabs-text-size,var(--spectrum-alias-font-size-default));font-weight:var(--spectrum-tabs-text-font-weight,var(--spectrum-alias-body-text-font-weight));line-height:1;margin:var(--sp-tab-vertial-margin-y) 0}
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
/**
 * @slot icon - The icon that appears on the left of the label
 */
class Tab extends FocusVisiblePolyfillMixin(ObserveSlotPresence(SpectrumElement, '[slot="icon"]')) {
    constructor() {
        super(...arguments);
        this.label = '';
        this.selected = false;
        this.vertical = false;
        this.value = '';
    }
    static get styles() {
        return [styles$7];
    }
    get hasIcon() {
        return this.slotContentIsPresent;
    }
    render() {
        return html `
            ${this.hasIcon
            ? html `
                      <slot name="icon"></slot>
                  `
            : html ``}
            ${this.label
            ? html `
                      <label id="itemLabel">
                          ${this.label}
                      </label>
                  `
            : html ``}
        `;
    }
    firstUpdated(changes) {
        super.firstUpdated(changes);
        this.setAttribute('role', 'tab');
    }
    updated(changes) {
        super.updated(changes);
        if (changes.has('selected')) {
            this.setAttribute('aria-selected', this.selected ? 'true' : 'false');
            this.setAttribute('tabindex', this.selected ? '0' : '-1');
        }
    }
}
__decorate([
    property({ reflect: true })
], Tab.prototype, "label", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], Tab.prototype, "selected", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], Tab.prototype, "vertical", void 0);
__decorate([
    property({ type: String, reflect: true })
], Tab.prototype, "value", void 0);

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
customElements.define('sp-tab', Tab);

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
const styles$8 = css `
:host{display:flex;position:relative;z-index:0;margin:0;padding-top:0;padding-bottom:0;padding-left:var(--spectrum-tabs-focus-ring-padding-x,var(--spectrum-global-dimension-size-100));padding-right:var(--spectrum-tabs-focus-ring-padding-x,var(--spectrum-global-dimension-size-100));vertical-align:top;border-bottom-color:var(--spectrum-tabs-rule-color,var(--spectrum-global-color-gray-200))}:host([dir=ltr]) ::slotted(*):before{left:calc(-1*var(--spectrum-tabs-focus-ring-padding-x, var(--spectrum-global-dimension-size-100)))}:host([dir=ltr]) ::slotted(*):before,:host([dir=rtl]) ::slotted(*):before{right:calc(-1*var(--spectrum-tabs-focus-ring-padding-x, var(--spectrum-global-dimension-size-100)))}:host([dir=rtl]) ::slotted(*):before{left:calc(-1*var(--spectrum-tabs-focus-ring-padding-x, var(--spectrum-global-dimension-size-100)))}:host([dir=ltr]) #selectionIndicator{left:0}:host([dir=rtl]) #selectionIndicator{right:0}#selectionIndicator{position:absolute;z-index:0;transition:transform var(--spectrum-tabs-selection-indicator-animation-duration,var(--spectrum-global-animation-duration-100)) ease-in-out;transform-origin:top left;border-radius:var(--spectrum-tabs-rule-border-radius,var(--spectrum-global-dimension-static-size-10));background-color:var(--spectrum-tabs-selection-indicator-color,var(--spectrum-global-color-gray-900))}:host([compact]) ::slotted(*){line-height:calc(var(--spectrum-tabs-quiet-compact-height,
var(--spectrum-global-dimension-size-400)) - var(--spectrum-tabs-rule-height,
var(--spectrum-alias-border-size-thick)));height:calc(var(--spectrum-tabs-quiet-compact-height,
var(--spectrum-global-dimension-size-400)) - var(--spectrum-tabs-rule-height,
var(--spectrum-alias-border-size-thick)))}:host([direction=horizontal]){align-items:center;border-bottom:var(--spectrum-tabs-rule-height,var(--spectrum-alias-border-size-thick)) solid}:host([direction=horizontal]) ::slotted(*){vertical-align:top}:host([dir=ltr][direction=horizontal]) ::slotted(:not(:first-child)){margin-left:var(--spectrum-tabs-item-gap,var(--spectrum-global-dimension-size-300))}:host([dir=rtl][direction=horizontal]) ::slotted(:not(:first-child)){margin-right:var(--spectrum-tabs-item-gap,var(--spectrum-global-dimension-size-300))}:host([direction=horizontal]) #selectionIndicator{position:absolute;bottom:0;height:var(--spectrum-tabs-rule-height,var(--spectrum-alias-border-size-thick));bottom:calc(-1*var(--spectrum-tabs-rule-height, var(--spectrum-alias-border-size-thick)))}:host([direction=horizontal][compact]){box-sizing:initial;height:calc(var(--spectrum-tabs-quiet-compact-height,
var(--spectrum-global-dimension-size-400)) - var(--spectrum-tabs-rule-height,
var(--spectrum-alias-border-size-thick)));align-items:end}:host([quiet]){display:inline-flex;border-bottom-color:var(--spectrum-tabs-quiet-rule-color,var(--spectrum-alias-border-color-transparent))}:host([dir=ltr][direction=vertical]){border-left:var(--spectrum-tabs-vertical-rule-width,var(--spectrum-alias-border-size-thick)) solid;border-left-color:var(--spectrum-tabs-vertical-rule-color,var(--spectrum-global-color-gray-200))}:host([dir=rtl][direction=vertical]){border-right:var(--spectrum-tabs-vertical-rule-width,var(--spectrum-alias-border-size-thick)) solid;border-right-color:var(--spectrum-tabs-vertical-rule-color,var(--spectrum-global-color-gray-200))}:host([direction=vertical]){display:inline-flex;flex-direction:column;padding:0}:host([dir=ltr][direction=vertical]) ::slotted(*){margin-left:calc(var(--spectrum-tabs-vertical-item-margin-left,
var(--spectrum-global-dimension-size-150)) - var(--spectrum-tabs-focus-ring-padding-x,
var(--spectrum-global-dimension-size-100)))}:host([dir=rtl][direction=vertical]) ::slotted(*){margin-right:calc(var(--spectrum-tabs-vertical-item-margin-left,
var(--spectrum-global-dimension-size-150)) - var(--spectrum-tabs-focus-ring-padding-x,
var(--spectrum-global-dimension-size-100)))}:host([direction=vertical]) ::slotted(*){height:var(--spectrum-tabs-vertical-item-height,var(--spectrum-global-dimension-size-550));padding-top:0;padding-bottom:0;padding-left:var(--spectrum-tabs-focus-ring-padding-x,var(--spectrum-global-dimension-size-100));padding-right:var(--spectrum-tabs-focus-ring-padding-x,var(--spectrum-global-dimension-size-100));margin-bottom:var(--spectrum-tabs-vertical-item-gap,var(--spectrum-global-dimension-size-50))}:host([dir=ltr][direction=vertical]) ::slotted(*):before{left:calc(-1*var(--spectrum-tabs-focus-ring-size, var(--spectrum-alias-border-size-thick)))}:host([dir=ltr][direction=vertical]) ::slotted(*):before,:host([dir=rtl][direction=vertical]) ::slotted(*):before{right:calc(-1*var(--spectrum-tabs-focus-ring-size, var(--spectrum-alias-border-size-thick)))}:host([dir=rtl][direction=vertical]) ::slotted(*):before{left:calc(-1*var(--spectrum-tabs-focus-ring-size, var(--spectrum-alias-border-size-thick)))}:host([direction=vertical]) ::slotted(*):before{margin-top:calc(var(--spectrum-tabs-focus-ring-height,
var(--spectrum-alias-single-line-height))/-2)}:host([direction=vertical][compact]) ::slotted(*){line-height:var(--spectrum-tabs-compact-vertical-item-height,var(--spectrum-global-dimension-size-400));margin-bottom:var(--spectrum-tabs-compact-vertical-item-gap,var(--spectrum-global-dimension-size-50));height:var(--spectrum-tabs-compact-vertical-item-height,var(--spectrum-global-dimension-size-400))}:host([dir=ltr][direction=vertical]) #selectionIndicator{left:0;left:calc(-1*var(--spectrum-tabs-vertical-rule-width, var(--spectrum-alias-border-size-thick)))}:host([dir=rtl][direction=vertical]) #selectionIndicator{right:0;right:calc(-1*var(--spectrum-tabs-vertical-rule-width, var(--spectrum-alias-border-size-thick)))}:host([direction=vertical]) #selectionIndicator{position:absolute;width:var(--spectrum-tabs-vertical-rule-width,var(--spectrum-alias-border-size-thick))}:host([quiet]) #selectionIndicator{background-color:var(--spectrum-tabs-quiet-selection-indicator-color,var(--spectrum-global-color-gray-900))}:host([dir=ltr][direction=vertical][compact]),:host([dir=ltr][direction=vertical][quiet]){border-left-color:var(--spectrum-tabs-quiet-vertical-rule-color,var(--spectrum-alias-border-color-transparent))}:host([dir=rtl][direction=vertical][compact]),:host([dir=rtl][direction=vertical][quiet]){border-right-color:var(--spectrum-tabs-quiet-vertical-rule-color,var(--spectrum-alias-border-color-transparent))}:host([direction=vertical][compact]) #selectionIndicator,:host([direction=vertical][quiet]) #selectionIndicator{background-color:var(--spectrum-tabs-quiet-selection-indicator-color,var(--spectrum-global-color-gray-900))}:host([direction=vertical-right]) #selectionIndicator,:host([direction=vertical]) #selectionIndicator{top:0;height:1px}:host([compact]){--spectrum-tabs-height:var(--spectrum-tabs-quiet-compact-height)}:host([direction=horizontal]:not([quiet])){border-bottom-color:var(--spectrum-tabs-rule-color,var(--spectrum-global-color-gray-200))}:host([dir][direction=horizontal]) #selectionIndicator{width:1px;left:0;right:auto}:host([dir=ltr][direction=vertical-right]){display:inline-flex;flex-direction:column;padding:0;border-right:var(--spectrum-tabs-vertical-rule-width,var(--spectrum-alias-border-size-thick)) solid;border-right-color:var(--spectrum-tabs-vertical-rule-color,var(--spectrum-global-color-gray-200))}:host([dir=rtl][direction=vertical-right]){display:inline-flex;flex-direction:column;padding:0;border-left:var(--spectrum-tabs-vertical-rule-width,var(--spectrum-alias-border-size-thick)) solid;border-left-color:var(--spectrum-tabs-vertical-rule-color,var(--spectrum-global-color-gray-200))}:host([dir=ltr][direction=vertical-right]) ::slotted(*){margin-right:calc(var(--spectrum-tabs-vertical-item-margin-left,
var(--spectrum-global-dimension-size-150)) - var(--spectrum-tabs-focus-ring-padding-x,
var(--spectrum-global-dimension-size-100)))}:host([dir=ltr][direction=vertical-right]) ::slotted(*),:host([dir=rtl][direction=vertical-right]) ::slotted(*){height:var(--spectrum-tabs-vertical-item-height,var(--spectrum-global-dimension-size-550));padding:0 var(--spectrum-tabs-focus-ring-padding-x,var(--spectrum-global-dimension-size-100));margin-bottom:var(--spectrum-tabs-vertical-item-gap,var(--spectrum-global-dimension-size-50))}:host([dir=rtl][direction=vertical-right]) ::slotted(*){margin-left:calc(var(--spectrum-tabs-vertical-item-margin-left,
var(--spectrum-global-dimension-size-150)) - var(--spectrum-tabs-focus-ring-padding-x,
var(--spectrum-global-dimension-size-100)))}:host([direction=vertical-right][compact]) ::slotted(*){line-height:var(--spectrum-tabs-compact-vertical-item-height,var(--spectrum-global-dimension-size-400));margin-bottom:var(--spectrum-tabs-compact-vertical-item-gap,var(--spectrum-global-dimension-size-50));height:var(--spectrum-tabs-compact-vertical-item-height,var(--spectrum-global-dimension-size-400))}:host([dir=ltr][direction=vertical-right]) #selectionIndicator{position:absolute;left:auto;width:var(--spectrum-tabs-vertical-rule-width,var(--spectrum-alias-border-size-thick));right:calc(-1*var(--spectrum-tabs-vertical-rule-width, var(--spectrum-alias-border-size-thick)))}:host([dir=rtl][direction=vertical-right]) #selectionIndicator{position:absolute;right:auto;width:var(--spectrum-tabs-vertical-rule-width,var(--spectrum-alias-border-size-thick));left:calc(-1*var(--spectrum-tabs-vertical-rule-width, var(--spectrum-alias-border-size-thick)))}:host([dir=ltr][direction=vertical-right][compact]),:host([dir=ltr][direction=vertical-right][quiet]){border-right-color:var(--spectrum-tabs-quiet-vertical-rule-color,var(--spectrum-alias-border-color-transparent))}:host([dir=rtl][direction=vertical-right][compact]),:host([dir=rtl][direction=vertical-right][quiet]){border-left-color:var(--spectrum-tabs-quiet-vertical-rule-color,var(--spectrum-alias-border-color-transparent))}:host([direction=vertical-right][compact]) #selectionIndicator,:host([direction=vertical-right][quiet]) #selectionIndicator{background-color:var(--spectrum-tabs-quiet-selection-indicator-color,var(--spectrum-global-color-gray-900))}
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
const availableArrowsByDirection = {
    vertical: ['ArrowUp', 'ArrowDown'],
    ['vertical-right']: ['ArrowUp', 'ArrowDown'],
    horizontal: ['ArrowLeft', 'ArrowRight'],
};
/**
 * @slot - Child tab elements
 * @attr {Boolean} quiet - The tabs border is a lot smaller
 * @attr {Boolean} compact - The collection of tabs take up less space
 */
class Tabs extends Focusable {
    constructor() {
        super();
        this.direction = 'horizontal';
        this.selectionIndicatorStyle = '';
        this._selected = '';
        this.tabs = [];
        /**
         * This will force apply the focus visible styling.
         * It should always do so when this styling is already applied.
         */
        this.shouldApplyFocusVisible = false;
        this.manageFocusinType = () => {
            if (this.shouldApplyFocusVisible) {
                return;
            }
            const handleFocusin = () => {
                this.shouldApplyFocusVisible = false;
                this.removeEventListener('focusin', handleFocusin);
            };
            this.addEventListener('focusin', handleFocusin);
        };
        this.startListeningToKeyboard = () => {
            this.addEventListener('keydown', this.handleKeydown);
            this.shouldApplyFocusVisible = true;
            const selected = this.querySelector('[selected]');
            if (selected) {
                selected.tabIndex = -1;
            }
            const stopListeningToKeyboard = () => {
                this.removeEventListener('keydown', this.handleKeydown);
                this.shouldApplyFocusVisible = false;
                const selected = this.querySelector('[selected]');
                if (selected) {
                    selected.tabIndex = 0;
                }
                this.removeEventListener('focusout', stopListeningToKeyboard);
            };
            this.addEventListener('focusout', stopListeningToKeyboard);
        };
        this.onClick = (event) => {
            const target = event.target;
            this.selectTarget(target);
            if (this.shouldApplyFocusVisible && event.composedPath()[0] !== this) {
                /* Trick :focus-visible polyfill into thinking keyboard based focus */
                this.dispatchEvent(new KeyboardEvent('keydown', {
                    code: 'Tab',
                }));
                target.focus();
            }
        };
        this.onKeyDown = (event) => {
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault();
                const target = event.target;
                if (target) {
                    this.selectTarget(target);
                }
            }
        };
        this.updateCheckedState = () => {
            if (!this.tabs.length) {
                this.tabs = [...this.querySelectorAll('[role="tab"]')];
            }
            this.tabs.forEach((element) => {
                element.removeAttribute('selected');
            });
            if (this.selected) {
                const currentChecked = this.tabs.find((el) => el.value === this.selected);
                if (currentChecked) {
                    currentChecked.selected = true;
                }
                else {
                    this.selected = '';
                }
            }
            else {
                const firstTab = this.tabs[0];
                if (firstTab) {
                    firstTab.setAttribute('tabindex', '0');
                }
            }
            this.updateSelectionIndicator();
            this.tabChangeResolver();
        };
        this.updateSelectionIndicator = async () => {
            const selectedElement = this.tabs.find((el) => el.selected);
            if (!selectedElement) {
                this.selectionIndicatorStyle = `transform: translateX(0px) scaleX(0) scaleY(0);`;
                return;
            }
            await Promise.all([
                selectedElement.updateComplete,
                document.fonts ? document.fonts.ready : Promise.resolve(),
            ]);
            const tabBoundingClientRect = selectedElement.getBoundingClientRect();
            const parentBoundingClientRect = this.getBoundingClientRect();
            if (this.direction === 'horizontal') {
                const width = tabBoundingClientRect.width;
                const offset = tabBoundingClientRect.left - parentBoundingClientRect.left;
                this.selectionIndicatorStyle = `transform: translateX(${offset}px) scaleX(${width});`;
            }
            else {
                const height = tabBoundingClientRect.height;
                const offset = tabBoundingClientRect.top - parentBoundingClientRect.top;
                this.selectionIndicatorStyle = `transform: translateY(${offset}px) scaleY(${height});`;
            }
        };
        this.tabChangePromise = Promise.resolve();
        this.tabChangeResolver = function () {
            return;
        };
        // These can be added as @click and @keydown handlers on the
        // slot once we no longer need web component polyfills
        this.addEventListener('click', this.onClick);
        this.addEventListener('keydown', this.onKeyDown);
    }
    static get styles() {
        return [styles$8];
    }
    get selected() {
        return this._selected;
    }
    set selected(value) {
        const oldValue = this.selected;
        if (value === oldValue) {
            return;
        }
        this._selected = value;
        this.shouldUpdateCheckedState();
        this.requestUpdate('selected', oldValue);
    }
    get focusElement() {
        const focusElement = this.tabs.find((tab) => tab.selected || tab.value === this.selected);
        if (focusElement) {
            return focusElement;
        }
        return this.tabs[0] || this;
    }
    manageAutoFocus() {
        const tabs = [...this.children];
        const tabUpdateCompletes = tabs.map((tab) => {
            if (typeof tab.updateComplete !== 'undefined') {
                return tab.updateComplete;
            }
            return Promise.resolve();
        });
        Promise.all(tabUpdateCompletes).then(() => super.manageAutoFocus());
    }
    render() {
        return html `
            <slot @slotchange=${this.onSlotChange}></slot>
            <div
                id="selectionIndicator"
                style=${this.selectionIndicatorStyle}
            ></div>
        `;
    }
    firstUpdated(changes) {
        super.firstUpdated(changes);
        this.setAttribute('role', 'tablist');
        this.addEventListener('mousedown', this.manageFocusinType);
        this.addEventListener('focusin', this.startListeningToKeyboard);
        const selectedChild = this.querySelector('[selected]');
        if (selectedChild) {
            this.selectTarget(selectedChild);
        }
    }
    updated(changes) {
        super.updated(changes);
        if (changes.has('direction')) {
            if (this.direction === 'horizontal') {
                this.removeAttribute('aria-orientation');
            }
            else {
                this.setAttribute('aria-orientation', 'vertical');
            }
        }
        if (changes.has('dir')) {
            this.updateSelectionIndicator();
        }
    }
    handleKeydown(event) {
        const { code } = event;
        const availableArrows = [...availableArrowsByDirection[this.direction]];
        if (!availableArrows.includes(code)) {
            return;
        }
        if (!this.isLTR && this.direction === 'horizontal') {
            availableArrows.reverse();
        }
        event.preventDefault();
        const currentFocusedTab = getActiveElement(this);
        let currentFocusedTabIndex = this.tabs.indexOf(currentFocusedTab);
        currentFocusedTabIndex += code === availableArrows[0] ? -1 : 1;
        this.tabs[(currentFocusedTabIndex + this.tabs.length) % this.tabs.length].focus();
    }
    selectTarget(target) {
        const value = target.getAttribute('value');
        if (value) {
            const selected = this.selected;
            this.selected = value;
            const applyDefault = this.dispatchEvent(new Event('change', {
                cancelable: true,
            }));
            if (!applyDefault) {
                this.selected = selected;
            }
        }
    }
    onSlotChange() {
        this.tabs = [...this.querySelectorAll('[role="tab"]')];
        this.shouldUpdateCheckedState();
    }
    shouldUpdateCheckedState() {
        this.tabChangeResolver();
        this.tabChangePromise = new Promise((res) => (this.tabChangeResolver = res));
        setTimeout(this.updateCheckedState);
    }
    async _getUpdateComplete() {
        await super._getUpdateComplete();
        await this.tabChangePromise;
    }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('resize', this.updateSelectionIndicator);
        if ('fonts' in document) {
            document.fonts.addEventListener('loadingdone', this.updateSelectionIndicator);
        }
    }
    disconnectedCallback() {
        window.removeEventListener('resize', this.updateSelectionIndicator);
        if ('fonts' in document) {
            document.fonts.removeEventListener('loadingdone', this.updateSelectionIndicator);
        }
        super.disconnectedCallback();
    }
}
__decorate([
    property({ reflect: true })
], Tabs.prototype, "direction", void 0);
__decorate([
    property()
], Tabs.prototype, "selectionIndicatorStyle", void 0);
__decorate([
    property({ reflect: true })
], Tabs.prototype, "selected", null);

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
customElements.define('sp-tabs', Tabs);

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
const styles$9 = css `
.button{position:relative;display:inline-flex;box-sizing:border-box;align-items:center;justify-content:center;overflow:visible;margin:0;border-style:solid;text-transform:none;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-appearance:button;vertical-align:top;transition:background var(--spectrum-global-animation-duration-100,.13s) ease-out,border-color var(--spectrum-global-animation-duration-100,.13s) ease-out,color var(--spectrum-global-animation-duration-100,.13s) ease-out,box-shadow var(--spectrum-global-animation-duration-100,.13s) ease-out;text-decoration:none;font-family:var(--spectrum-alias-body-text-font-family,var(--spectrum-global-font-family-base));line-height:1.3;-moz-user-select:none;user-select:none;-webkit-user-select:none;touch-action:none;cursor:pointer}.button:focus{outline:none}.button::-moz-focus-inner{border:0;border-style:none;padding:0;margin-top:-2px;margin-bottom:-2px}.button:disabled{cursor:default}::slotted([slot=icon]){max-height:100%;flex-shrink:0}:host{display:inline-flex;flex-direction:row;vertical-align:top}#button{display:flex;flex:1 1 auto;-webkit-appearance:none}slot[name=icon]::slotted(svg){fill:currentColor;stroke:currentColor;width:var(--spectrum-alias-workflow-icon-size,18px);height:var(--spectrum-alias-workflow-icon-size,18px)}
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
class ButtonBase extends LikeAnchor(ObserveSlotText(ObserveSlotPresence(Focusable, '[slot="icon"]'))) {
    constructor() {
        super(...arguments);
        this.iconRight = false;
    }
    static get styles() {
        return [styles$9];
    }
    get hasIcon() {
        return this.slotContentIsPresent;
    }
    get hasLabel() {
        return this.slotHasContent;
    }
    get focusElement() {
        return this.buttonElement;
    }
    get buttonContent() {
        const icon = html `
            <slot name="icon"></slot>
        `;
        const content = [
            html `
                <div id="label" ?hidden=${!this.hasLabel}>
                    <slot
                        id="slot"
                        @slotchange=${this.manageTextObservedSlot}
                    ></slot>
                </div>
            `,
        ];
        if (!this.hasIcon) {
            return content;
        }
        this.iconRight ? content.push(icon) : content.unshift(icon);
        return content;
    }
    renderButton() {
        return html `
            <button
                id="button"
                class="button"
                aria-label=${ifDefined(this.label)}
            >
                ${this.buttonContent}
            </button>
        `;
    }
    render() {
        return this.href && this.href.length > 0
            ? this.renderAnchor({
                id: 'button',
                className: 'button',
                anchorContent: this.buttonContent,
            })
            : this.renderButton();
    }
}
__decorate([
    property({ type: Boolean, reflect: true, attribute: 'icon-right' })
], ButtonBase.prototype, "iconRight", void 0);
__decorate([
    query('.button')
], ButtonBase.prototype, "buttonElement", void 0);

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
const styles$a = css `
.button:after{border-radius:calc(var(--spectrum-button-primary-border-radius,
var(--spectrum-alias-border-radius-large)) + var(--spectrum-alias-focus-ring-gap,
var(--spectrum-global-dimension-static-size-25)));content:"";display:block;position:absolute;left:0;right:0;bottom:0;top:0;margin:calc(var(--spectrum-alias-focus-ring-gap,
var(--spectrum-global-dimension-static-size-25))*-1);transition:box-shadow var(--spectrum-global-animation-duration-100,.13s) ease-out,margin var(--spectrum-global-animation-duration-100,.13s) ease-out}.button.focus-visible:after{margin:calc(var(--spectrum-alias-focus-ring-gap,
var(--spectrum-global-dimension-static-size-25))*-2)}.button{border-width:var(--spectrum-button-primary-border-size,var(--spectrum-alias-border-size-thick));border-style:solid;border-radius:var(--spectrum-button-primary-border-radius,var(--spectrum-alias-border-radius-large));min-height:var(--spectrum-button-primary-height,var(--spectrum-alias-single-line-height));height:auto;min-width:var(--spectrum-button-primary-min-width);padding:var(--spectrum-global-dimension-size-50) calc(var(--spectrum-button-primary-padding-x,
var(--spectrum-global-dimension-size-200)) - var(--spectrum-button-primary-border-size,
var(--spectrum-alias-border-size-thick)));padding-bottom:calc(var(--spectrum-global-dimension-size-50) + 1px);padding-top:calc(var(--spectrum-global-dimension-size-50) - 1px);font-size:var(--spectrum-button-primary-text-size,var(--spectrum-alias-pill-button-text-size));font-weight:var(--spectrum-button-primary-text-font-weight,var(--spectrum-global-font-weight-bold))}.button:active,.button:hover{box-shadow:none}:host([dir=ltr]) .button slot[name=icon]+#label{margin-left:var(--spectrum-button-primary-text-gap,var(--spectrum-global-dimension-size-100))}:host([dir=rtl]) .button slot[name=icon]+#label{margin-right:var(--spectrum-button-primary-text-gap,var(--spectrum-global-dimension-size-100))}:host([dir=ltr]) .button #label+::slotted([slot=icon]){margin-left:calc(var(--spectrum-button-primary-text-gap,
var(--spectrum-global-dimension-size-100))/2)}:host([dir=rtl]) .button #label+::slotted([slot=icon]){margin-right:calc(var(--spectrum-button-primary-text-gap,
var(--spectrum-global-dimension-size-100))/2)}#label{align-self:center;justify-self:center;text-align:center}#label:empty{display:none}.button.focus-visible:after,.button.is-focused:after{box-shadow:0 0 0 var(--spectrum-button-primary-focus-ring-size-key-focus,var(--spectrum-alias-focus-ring-size)) var(--spectrum-button-primary-focus-ring-color-key-focus,var(--spectrum-alias-focus-ring-color))}:host([variant=cta]) .button{background-color:var(--spectrum-button-cta-background-color,var(--spectrum-semantic-cta-color-background-default));border-color:var(--spectrum-button-cta-border-color,var(--spectrum-semantic-cta-color-background-default));color:var(--spectrum-button-cta-text-color,var(--spectrum-global-color-static-white))}:host([variant=cta]) .button:hover{background-color:var(--spectrum-button-cta-background-color-hover,var(--spectrum-semantic-cta-color-background-hover));border-color:var(--spectrum-button-cta-border-color-hover,var(--spectrum-semantic-cta-color-background-hover));color:var(--spectrum-button-cta-text-color-hover,var(--spectrum-global-color-static-white))}:host([variant=cta]) .button.focus-visible{background-color:var(--spectrum-button-cta-background-color-key-focus,var(--spectrum-semantic-cta-color-background-hover));border-color:var(--spectrum-button-cta-border-color-key-focus,var(--spectrum-semantic-cta-color-background-hover));color:var(--spectrum-button-cta-text-color-key-focus,var(--spectrum-global-color-static-white))}:host([variant=cta]) .button:active{background-color:var(--spectrum-button-cta-background-color-down,var(--spectrum-semantic-cta-color-background-down));border-color:var(--spectrum-button-cta-border-color-down,var(--spectrum-semantic-cta-color-background-down));color:var(--spectrum-button-cta-text-color-down,var(--spectrum-global-color-static-white))}:host([variant=cta][disabled]) .button{background-color:var(--spectrum-button-cta-background-color-disabled,var(--spectrum-global-color-gray-200));border-color:var(--spectrum-button-cta-border-color-disabled,var(--spectrum-global-color-gray-200));color:var(--spectrum-button-cta-text-color-disabled,var(--spectrum-global-color-gray-500))}:host([variant=primary]) .button{background-color:var(--spectrum-button-primary-background-color,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-primary-border-color,var(--spectrum-global-color-gray-800));color:var(--spectrum-button-primary-text-color,var(--spectrum-global-color-gray-800))}:host([variant=primary]) .button:hover{background-color:var(--spectrum-button-primary-background-color-hover,var(--spectrum-global-color-gray-800));border-color:var(--spectrum-button-primary-border-color-hover,var(--spectrum-global-color-gray-800));color:var(--spectrum-button-primary-text-color-hover,var(--spectrum-global-color-gray-50))}:host([variant=primary]) .button.focus-visible{background-color:var(--spectrum-button-primary-background-color-key-focus,var(--spectrum-global-color-gray-800));border-color:var(--spectrum-button-primary-border-color-key-focus,var(--spectrum-global-color-gray-800));color:var(--spectrum-button-primary-text-color-key-focus,var(--spectrum-global-color-gray-50))}:host([variant=primary]) .button:active{background-color:var(--spectrum-button-primary-background-color-down,var(--spectrum-global-color-gray-900));border-color:var(--spectrum-button-primary-border-color-down,var(--spectrum-global-color-gray-900));color:var(--spectrum-button-primary-text-color-down,var(--spectrum-global-color-gray-50))}:host([variant=primary][disabled]) .button{background-color:var(--spectrum-button-primary-background-color-disabled,var(--spectrum-global-color-gray-200));border-color:var(--spectrum-button-primary-border-color-disabled,var(--spectrum-global-color-gray-200));color:var(--spectrum-button-primary-text-color-disabled,var(--spectrum-global-color-gray-500))}:host([variant=secondary]) .button{background-color:var(--spectrum-button-secondary-background-color,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-secondary-border-color,var(--spectrum-global-color-gray-700));color:var(--spectrum-button-secondary-text-color,var(--spectrum-global-color-gray-700))}:host([variant=secondary]) .button:hover{background-color:var(--spectrum-button-secondary-background-color-hover,var(--spectrum-global-color-gray-700));border-color:var(--spectrum-button-secondary-border-color-hover,var(--spectrum-global-color-gray-700));color:var(--spectrum-button-secondary-text-color-hover,var(--spectrum-global-color-gray-50))}:host([variant=secondary]) .button.focus-visible{background-color:var(--spectrum-button-secondary-background-color-key-focus,var(--spectrum-global-color-gray-700));border-color:var(--spectrum-button-secondary-border-color-key-focus,var(--spectrum-global-color-gray-700));color:var(--spectrum-button-secondary-text-color-key-focus,var(--spectrum-global-color-gray-50))}:host([variant=secondary]) .button:active{background-color:var(--spectrum-button-secondary-background-color-down,var(--spectrum-global-color-gray-800));border-color:var(--spectrum-button-secondary-border-color-down,var(--spectrum-global-color-gray-800));color:var(--spectrum-button-secondary-text-color-down,var(--spectrum-global-color-gray-50))}:host([variant=secondary][disabled]) .button{background-color:var(--spectrum-button-secondary-background-color-disabled,var(--spectrum-global-color-gray-200));border-color:var(--spectrum-button-secondary-border-color-disabled,var(--spectrum-global-color-gray-200));color:var(--spectrum-button-secondary-text-color-disabled,var(--spectrum-global-color-gray-500))}:host([variant=negative]) .button{background-color:var(--spectrum-button-warning-background-color,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-warning-border-color,var(--spectrum-semantic-negative-color-text-small));color:var(--spectrum-button-warning-text-color,var(--spectrum-semantic-negative-color-text-small))}:host([variant=negative]) .button:hover{background-color:var(--spectrum-button-warning-background-color-hover,var(--spectrum-semantic-negative-color-text-small));border-color:var(--spectrum-button-warning-border-color-hover,var(--spectrum-semantic-negative-color-text-small));color:var(--spectrum-button-warning-text-color-hover,var(--spectrum-global-color-gray-50))}:host([variant=negative]) .button.focus-visible{background-color:var(--spectrum-button-warning-background-color-key-focus,var(--spectrum-semantic-negative-color-text-small));border-color:var(--spectrum-button-warning-border-color-key-focus,var(--spectrum-semantic-negative-color-text-small));color:var(--spectrum-button-warning-text-color-key-focus,var(--spectrum-global-color-gray-50))}:host([variant=negative]) .button:active{background-color:var(--spectrum-button-warning-background-color-down,var(--spectrum-global-color-red-700));border-color:var(--spectrum-button-warning-border-color-down,var(--spectrum-global-color-red-700));color:var(--spectrum-button-warning-text-color-down,var(--spectrum-global-color-gray-50))}:host([variant=negative][disabled]) .button{background-color:var(--spectrum-button-warning-background-color-disabled,var(--spectrum-global-color-gray-200));border-color:var(--spectrum-button-warning-border-color-disabled,var(--spectrum-global-color-gray-200));color:var(--spectrum-button-warning-text-color-disabled,var(--spectrum-global-color-gray-500))}:host([variant=overBackground]) .button{background-color:var(--spectrum-button-over-background-background-color,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-over-background-border-color,var(--spectrum-global-color-static-white));color:var(--spectrum-button-over-background-text-color,var(--spectrum-global-color-static-white))}:host([variant=overBackground]) .button.focus-visible,:host([variant=overBackground]) .button:hover{background-color:var(--spectrum-button-over-background-background-color-hover,var(--spectrum-global-color-static-white));border-color:var(--spectrum-button-over-background-border-color-hover,var(--spectrum-global-color-static-white));color:inherit}:host([variant=overBackground]) .button.focus-visible:after{box-shadow:0 0 0 var(--spectrum-alias-focus-ring-size,var(--spectrum-global-dimension-static-size-25)) var(--spectrum-button-over-background-border-color-key-focus,var(--spectrum-global-color-static-white))}:host([variant=overBackground]) .button:active{background-color:var(--spectrum-button-over-background-background-color-down,var(--spectrum-global-color-static-white));border-color:var(--spectrum-button-over-background-border-color-down,var(--spectrum-global-color-static-white));color:inherit}:host([variant=overBackground][disabled]) .button{background-color:var(--spectrum-button-over-background-background-color-disabled,hsla(0,0%,100%,.1));border-color:var(--spectrum-button-over-background-border-color-disabled,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-over-background-text-color-disabled,hsla(0,0%,100%,.35))}:host([variant=overBackground][quiet]) .button{background-color:var(--spectrum-button-quiet-over-background-background-color,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-quiet-over-background-border-color,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-quiet-over-background-text-color,var(--spectrum-global-color-static-white))}:host([variant=overBackground][quiet]) .button.focus-visible,:host([variant=overBackground][quiet]) .button:hover{background-color:var(--spectrum-button-quiet-over-background-background-color-hover,hsla(0,0%,100%,.1));border-color:var(--spectrum-button-quiet-over-background-border-color-hover,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-quiet-over-background-text-color-hover,var(--spectrum-global-color-static-white))}:host([variant=overBackground][quiet]) .button.focus-visible{box-shadow:none}:host([variant=overBackground][quiet]) .button.focus-visible:after{box-shadow:0 0 0 var(--spectrum-alias-focus-ring-size,var(--spectrum-global-dimension-static-size-25)) var(--spectrum-button-over-background-border-color-key-focus,var(--spectrum-global-color-static-white))}:host([variant=overBackground][quiet]) .button:active{background-color:var(--spectrum-button-quiet-over-background-background-color-down,hsla(0,0%,100%,.15));border-color:var(--spectrum-button-quiet-over-background-border-color-down,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-quiet-over-background-text-color-down,var(--spectrum-global-color-static-white))}:host([variant=overBackground][quiet][disabled]) .button{background-color:var(--spectrum-button-quiet-over-background-background-color-disabled,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-quiet-over-background-border-color-disabled,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-quiet-over-background-text-color-disabled,hsla(0,0%,100%,.15))}:host([variant=primary][quiet]) .button{background-color:var(--spectrum-button-quiet-primary-background-color,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-quiet-primary-border-color,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-quiet-primary-text-color,var(--spectrum-global-color-gray-800))}:host([variant=primary][quiet]) .button:hover{background-color:var(--spectrum-button-quiet-primary-background-color-hover,var(--spectrum-global-color-gray-200));border-color:var(--spectrum-button-quiet-primary-border-color-hover,var(--spectrum-global-color-gray-200));color:var(--spectrum-button-quiet-primary-text-color-hover,var(--spectrum-global-color-gray-900))}:host([variant=primary][quiet]) .button.focus-visible{background-color:var(--spectrum-button-quiet-primary-background-color-key-focus,var(--spectrum-global-color-gray-200));border-color:var(--spectrum-button-quiet-primary-border-color-key-focus,var(--spectrum-global-color-gray-200));color:var(--spectrum-button-quiet-primary-text-color-key-focus,var(--spectrum-global-color-gray-900))}:host([variant=primary][quiet]) .button:active{background-color:var(--spectrum-button-quiet-primary-background-color-down,var(--spectrum-global-color-gray-300));border-color:var(--spectrum-button-quiet-primary-border-color-down,var(--spectrum-global-color-gray-300));color:var(--spectrum-button-quiet-primary-text-color-down,var(--spectrum-global-color-gray-900))}:host([variant=primary][quiet][disabled]) .button{background-color:var(--spectrum-button-quiet-primary-background-color-disabled,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-quiet-primary-border-color-disabled,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-quiet-primary-text-color-disabled,var(--spectrum-global-color-gray-500))}:host([variant=secondary][quiet]) .button{background-color:var(--spectrum-button-quiet-secondary-background-color,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-quiet-secondary-border-color,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-quiet-secondary-text-color,var(--spectrum-global-color-gray-700))}:host([variant=secondary][quiet]) .button:hover{background-color:var(--spectrum-button-quiet-secondary-background-color-hover,var(--spectrum-global-color-gray-200));border-color:var(--spectrum-button-quiet-secondary-border-color-hover,var(--spectrum-global-color-gray-200));color:var(--spectrum-button-quiet-secondary-text-color-hover,var(--spectrum-global-color-gray-800))}:host([variant=secondary][quiet]) .button.focus-visible{background-color:var(--spectrum-button-quiet-secondary-background-color-key-focus,var(--spectrum-global-color-gray-200));border-color:var(--spectrum-button-quiet-secondary-border-color-key-focus,var(--spectrum-global-color-gray-200));color:var(--spectrum-button-quiet-secondary-text-color-key-focus,var(--spectrum-global-color-gray-800))}:host([variant=secondary][quiet]) .button:active{background-color:var(--spectrum-button-quiet-secondary-background-color-down,var(--spectrum-global-color-gray-300));border-color:var(--spectrum-button-quiet-secondary-border-color-down,var(--spectrum-global-color-gray-300));color:var(--spectrum-button-quiet-secondary-text-color-down,var(--spectrum-global-color-gray-800))}:host([variant=secondary][quiet][disabled]) .button{background-color:var(--spectrum-button-quiet-secondary-background-color-disabled,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-quiet-secondary-border-color-disabled,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-quiet-secondary-text-color-disabled,var(--spectrum-global-color-gray-500))}:host([variant=negative][quiet]) .button{background-color:var(--spectrum-button-quiet-warning-background-color,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-quiet-warning-border-color,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-quiet-warning-text-color,var(--spectrum-semantic-negative-color-text-small))}:host([variant=negative][quiet]) .button:hover{background-color:var(--spectrum-button-quiet-warning-background-color-hover,var(--spectrum-global-color-gray-200));border-color:var(--spectrum-button-quiet-warning-border-color-hover,var(--spectrum-global-color-gray-200));color:var(--spectrum-button-quiet-warning-text-color-hover,var(--spectrum-global-color-red-700))}:host([variant=negative][quiet]) .button.focus-visible{background-color:var(--spectrum-button-quiet-warning-background-color-key-focus,var(--spectrum-global-color-gray-200));border-color:var(--spectrum-button-quiet-warning-border-color-key-focus,var(--spectrum-global-color-gray-200));color:var(--spectrum-button-quiet-warning-text-color-key-focus,var(--spectrum-global-color-red-700))}:host([variant=negative][quiet]) .button:active{background-color:var(--spectrum-button-quiet-warning-background-color-down,var(--spectrum-global-color-gray-300));border-color:var(--spectrum-button-quiet-warning-border-color-down,var(--spectrum-global-color-gray-300));color:var(--spectrum-button-quiet-warning-text-color-down,var(--spectrum-global-color-red-700))}:host([variant=negative][quiet][disabled]) .button{background-color:var(--spectrum-button-quiet-warning-background-color-disabled,var(--spectrum-alias-background-color-transparent));border-color:var(--spectrum-button-quiet-warning-border-color-disabled,var(--spectrum-alias-border-color-transparent));color:var(--spectrum-button-quiet-warning-text-color-disabled,var(--spectrum-global-color-gray-500))}
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
/**
 * A Spectrum button control.
 * @element sp-button
 */
class Button extends ButtonBase {
    constructor() {
        super(...arguments);
        /**
         * The visual variant to apply to this button.
         */
        this.variant = 'cta';
        /**
         * There is a warning in place for this control
         */
        this.warning = false;
        /**
         * Style this button to be less obvious
         */
        this.quiet = false;
    }
    static get styles() {
        return [...super.styles, styles$a];
    }
}
__decorate([
    property({ reflect: true })
], Button.prototype, "variant", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], Button.prototype, "warning", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], Button.prototype, "quiet", void 0);

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
customElements.define('sp-button', Button);

/** get mean value */
const Mean = array => array.reduce((a, b) => a + b) / array.length;

/** round value */
const Round = num => Math.round(num * 1e4) / 1e4;

/** pre calculated square root of 2 */
const SquareRootOfTwo = Math.sqrt(2);

/** pre calculated square root of 3 */
const SquareRootOfThree = Math.sqrt(3);

class BaseShapes {
    static get DEFAULT_DISTANCE() { return 7 };

    static get DEFAULT_RENDERER() { return 'svgpath' };

    get rendererType() {
        return this.constructor.ShapeName;
    }

    /**
     * set distance between shapes
     * can be done after initializing, unlike the constructor options
     * @param val
     */
    set distanceBetween(val) {
        this.opts.distanceBetween = val;
        if (this.inputSource) {
            this.init();
        }
    }

    get distanceBetween() {
        return this.opts.distanceBetween;
    }

    /**
     * @param options - optional config options
     * @param inputimage - optional ImageElement to use when not wanting to load by URL
     */
    constructor(options, inputimage) {
        /**
         * dots array
         */
        this.dots = [];

        /**
         * buckets array
         */
        this.buckets = [];

        /**
         * input image
         */
        this.inputSource = undefined;

        /**
         * output canvas (if canvas/bitmap rendering)
         */
        this.outputCanvas = options.outputCanvas ? options.outputCanvas : undefined;

        /**
         * buffer canvas for retrieving image data
         */
        this.buffer = document.createElement('canvas');

        /**
         * buffer canvas context for retrieving image data
         */
        this.bufferContext = undefined;

        /**
         * output canvas context
         */
        this.outputCanvasContext = undefined;

        /**
         * input image data
         */
        this.inputData = undefined;

        /**
         * width of image
         */
        this.width = undefined;

        /**
         * height of image
         */
        this.height = undefined;

        /**
         * benchmarking checkpoints and times
         * @type {*[]}
         */
        this.benchmarking = [];

        /**
         * render options
         */
        this.opts = options || {};

        if (this.opts.distanceBetween === undefined) {
            this.opts.distanceBetween = BaseShapes.DEFAULT_DISTANCE;
        }

        if (this.opts.renderer === undefined) {
            this.opts.renderer = BaseShapes.DEFAULT_RENDERER;
        }

        // Any extra constructor setup from derived classes
        this.preInit();

        if (inputimage) {
            this.input = inputimage;
        }
    }

    get isSourceReady() {
        if (!this.width) {
            return false;
        }

        if (!this.height) {
            return false;
        }
        return true;
    }

    preInit() {}

    /**
     * load image by URL
     * @param url
     * @return {Promise<unknown>}
     */
    async loadImage(url) {
        return new Promise( (resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', e => {
                this.input = image;
                resolve();
            });
            image.src = url;
        });
    }

    /**
     * set input image directly
     * @param src
     */
    set input(src) {
        this.inputSource = src;
        this.width = this.inputSource.width | this.inputSource.videoWidth;
        this.height = this.inputSource.height | this.inputSource.videoHeight;
        if (this.isSourceReady) {
            this.init();
        }
    }


    /**
     * process pixels from image
     */
    processPixels() {}

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {}

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {}

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {}

    /**
     * organize pixels into buckets
     * @param x
     * @param y
     */
    pushToBucket(x, y) {
        this.dots.push({ x, y });
        const xx = Math.ceil(x / 10);
        const yy = Math.ceil(y / 10);
        this.buckets[xx] = this.buckets[xx] || [];
        this.buckets[xx][yy] = this.buckets[xx][yy] || [];
        this.buckets[xx][yy].push({ x, y, i: this.dots.length - 1 });
    }

    /**
     * precalc and initialize some constants
     */
    init() {
        let benchmark;
        if (this.opts.benchmark) {
            benchmark = { start: Date.now(), title: 'initialization'};
        }
        this.dots = [];
        this.buckets = [];
        this.m = Math.max(this.width, this.height);
        this.div = Math.max(1, this.m / 1000);
        this.scale = this.opts.distanceBetween / 3;
        this.W = Math.round(this.width / this.div / this.scale);
        this.H = Math.round(this.height / this.div / this.scale);
        this.A = this.opts.distanceBetween / this.scale;
        this.aspectRatio = this.width / this.height;

        this.buffer.width = this.W;
        this.buffer.height = this.H;
        this.bufferContext = this.buffer.getContext('2d');
        this.bufferContext.drawImage(this.inputSource, 0, 0, this.W, this.H);
        this.inputData = this.bufferContext.getImageData(0, 0, this.W, this.H).data;

        if (this.opts.renderer === 'canvas') {
            this.setCanvasOutputSize(this.opts.outputSize ? this.opts.outputSize.width : this.width,this.opts.outputSize? this.opts.outputSize.height : this.height);
        }

        if (benchmark) {
            benchmark.end = Date.now();
            this.benchmarking.push(benchmark);
            benchmark = { start: Date.now(), title: 'process'};
        }
        this.processPixels();

        if (benchmark) {
            benchmark.end = Date.now();
            this.benchmarking.push(benchmark);
        }
    }

    setCanvasOutputSize(w, h) {
        this.opts.outputSize = { width: w, height: h };
        if (!this.outputCanvas) {
            this.outputCanvas = document.createElement('canvas');
        }
        this.outputCanvas.width = w;
        this.outputCanvas.height = h;
        this.outputCanvasContext = this.outputCanvas.getContext('2d');
    }

    render(refreshImage = false) {
        if (refreshImage) {
            // re-read image source without having to do initialization work or resize
            // intended for video sources where nothing changes except the image in the frame
            this.dots = [];
            this.buckets = [];
            this.bufferContext.drawImage(this.inputSource, 0, 0, this.W, this.H);
            this.inputData = this.bufferContext.getImageData(0, 0, this.W, this.H).data;
            this.processPixels();
        }

        let benchmark;
        if (this.opts.benchmark) {
            benchmark = { start: Date.now(), title: 'calculate' };
        }

        for (let y = 0; y < this.H; y++) {
            for (let x = 0; x < this.W; x++) {
                const i = y * (this.W * 4) + x * 4;
                let closest = Infinity;
                let theDot;
                const X = Math.ceil(x / 10);
                const Y = Math.ceil(y / 10);
                const theDots = [].concat(
                    this.buckets[X][Y] || [],
                    this.buckets[X][Y - 1] || [],
                    this.buckets[X][Y + 1] || [],
                    this.buckets[X - 1] ? this.buckets[X - 1][Y] || [] : [],
                    this.buckets[X - 1] ? this.buckets[X - 1][Y - 1] || [] : [],
                    this.buckets[X - 1] ? this.buckets[X - 1][Y + 1] || [] : [],
                    this.buckets[X + 1] ? this.buckets[X + 1][Y] || [] : [],
                    this.buckets[X + 1] ? this.buckets[X + 1][Y - 1] || [] : [],
                    this.buckets[X + 1] ? this.buckets[X + 1][Y + 1] || [] : []
                );
                for (let dt = 0; dt < theDots.length; dt++) {
                    const d = (theDots[dt].x - x) ** 2 + (theDots[dt].y - y) ** 2;
                    if (d < closest) {
                        closest = d;
                        theDot = this.dots[theDots[dt].i];
                    }
                }
                theDot.v = theDot.v || [];
                const green = this.inputData[i + 1] || 0;
                if (this.opts.inverse === true) {
                    theDot.v.push(green);
                }
                if (!this.opts.inverse) {
                    theDot.v.push(255 - green);
                }
            }
        }

        if (benchmark) {
            benchmark.end = Date.now();
            this.benchmarking.push(benchmark);
            benchmark = { start: Date.now(), title: 'render' };
        }

        let output;
        switch (this.opts.renderer) {
            case 'svgpath':
                output = this.renderSVGPath();
                break;

            case 'svg':
                const svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
                svg.setAttribute('width', this.width);
                svg.setAttribute('height', this.height);
                svg.innerHTML = `<path d="${this.renderSVGPath()}"></path>`;
                output = svg;
                break;

            case 'canvas':
                this.renderBitmap();
                output = this.outputCanvas;
                break;

        }

        if (benchmark) {
            benchmark.end = Date.now();
            this.benchmarking.push(benchmark);
            this.logPerformance();
        }

        return output;
    }

    renderSVGPath() {
        const outputScaling = { x: this.width / ( this.W * this.scale ), y: this.height / ( this.H * this.scale) };
        const path = [];
        this.dots.forEach(dot => {
            if (!dot.v) {
                return;
            }
            const wantRate = Mean(dot.v) / 255;
            let r = this.calculateR(wantRate);
            const cx = dot.x * this.scale * outputScaling.x;
            const cy = dot.y * this.scale * outputScaling.y;
            r = Round(r * this.scale) * outputScaling.x;
            path.push(this.renderSVGShape(cx, cy, r));
        });
        return path.join('');
    }

    renderBitmap() {
        const outputScaling = { x: this.outputCanvas.width / ( this.W * this.scale ), y: this.outputCanvas.height / ( this.H * this.scale) };
        this.dots.forEach(dot => {
            if (!dot.v) {
                return;
            }
            const wantRate = Mean(dot.v) / 255;
            let r = this.calculateR(wantRate);
            const cx = dot.x * this.scale * outputScaling.x;
            const cy = dot.y * this.scale * outputScaling.y;
            r = Round(r * this.scale) * outputScaling.x;
            this.renderBitmapShape(cx, cy, r);
        });
    }

    logPerformance() {
        let ttltime = 0;
        this.benchmarking.forEach( task => {
            const time = task.end - task.start;
            ttltime += time;
            console.log(` - ${task.title} : ${time}ms`);
        });
        console.log(` Total time: ${ttltime} ms`);
        this.benchmarking = [];
    }

    clearBenchmarks() {
        this.benchmarking = [];
    }
}

// Bitmap Square Primitive

const SQUARE = (ctx, cx, cy, r) => {
    ctx.beginPath();
    ctx.rect(cx - r / 2, cy  - r / 2, r , r );
    ctx.fill();
};

// Bitmap Circle Primitive
const CIRCLE = (ctx, cx, cy, r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fill();
};

// Bitmap Triangle Primitive
const TRIANGLE = (ctx, cx, cy, r, flipped) => {
    const aa = (r / 3) * 2;
    ctx.beginPath();

    let startX = cx;
    let startY = cy + flipped * aa;
    let currX = startX;
    let currY = startY;
    ctx.moveTo(currX, currY);

    currX += (-aa * SquareRootOfThree) / 2;
    currY += (flipped * -aa / 2) * 3;
    ctx.lineTo(currX, currY);

    currX += aa * SquareRootOfThree;
    ctx.lineTo(currX, currY);
    ctx.lineTo(startX, startY);
    ctx.fill();
};

// Bitmap Diamond Primitive
const DIAMOND = (ctx, cx, cy, r) => {
    const r2 = r /= SquareRootOfTwo;
    ctx.beginPath();

    let startX = cx;
    let startY = cy - r2 / 2;
    let currX = startX;
    let currY = startY;
    ctx.moveTo(currX, currY);

    currX += r2;
    currY += r2;
    ctx.lineTo(currX, currY);

    currX += -r2;
    currY += r2;
    ctx.lineTo(currX, currY);

    currX += -r2;
    currY += -r2;
    ctx.lineTo(currX, currY);

    ctx.lineTo(startX, startY);
    ctx.fill();
};

// Bitmap Hexagon Primitive
const HEXAGON = (ctx, cx, cy, r) => {
    const r2 = r / 2;
    const r23 = r2 * SquareRootOfThree;
    ctx.beginPath();

    let startX = cx;
    let startY = cy - r;
    let currX = startX;
    let currY = startY;
    ctx.moveTo(currX, currY);

    currX += r23;
    currY += r2;
    ctx.lineTo(currX, currY);

    currY += r;
    ctx.lineTo(currX, currY);

    currX += -r23;
    currY += r2;
    ctx.lineTo(currX, currY);

    currX += -r23;
    currY += -r2;
    ctx.lineTo(currX, currY);

    currY += -r;
    ctx.lineTo(currX, currY);

    ctx.lineTo(startX, startY);
    ctx.fill();
};

// Bitmap Cross Primitive
const CROSS = (ctx, cx, cy, r, b) => {
    ctx.beginPath();

    let startX = cx - r / 2;
    let startY = cy - b - r / 2;
    let currX = startX;
    let currY = startY;
    ctx.moveTo(currX, currY);

    currX += r;
    ctx.lineTo(currX, currY);

    currY += b;
    ctx.lineTo(currX, currY);

    currX += b;
    ctx.lineTo(currX, currY);

    currY += r;
    ctx.lineTo(currX, currY);

    currX += -b;
    ctx.lineTo(currX, currY);

    currY += b;
    ctx.lineTo(currX, currY);

    currX += -r;
    ctx.lineTo(currX, currY);

    currY += -b;
    ctx.lineTo(currX, currY);

    currX += -b;
    ctx.lineTo(currX, currY);

    currY += -r;
    ctx.lineTo(currX, currY);

    currX += b;
    ctx.lineTo(currX, currY);

    ctx.lineTo(startX, startY);
    ctx.fill();
};

// SVG Square Primitive
const SQUARE$1 = (cx, cy, r) => {
    return `M${cx - r / 2},${cy - r / 2}h${r}v${r}h${-r}z`;
};

// SVG Circle Primitive
const CIRCLE$1 = (cx, cy, r) => {
    return `M${Round(cx)},${Round(cy - r)}a${[r, r, 0, 0, 1, 0, 2 * r]}a${[
        r,
        r,
        0,
        0,
        1,
        0,
        -2 * r
    ]}z`
};

// SVG Triangle Primitive
const TRIANGLE$1 = (cx, cy, r, flipped) => {
    const aa = (r / 3) * 2;
    return `M${cx},${cy + flipped * aa}l${(-aa * SquareRootOfThree) / 2},${(flipped * -aa / 2) * 3}h${aa * SquareRootOfThree}z`;
};

// SVG Diamond Primitive
const DIAMOND$1 = (cx, cy, r) => {
    const r2 = r /= SquareRootOfTwo;
    return `M${cx},${cy - r2 / 2}l${r2},${r2},${-r2},${r2},${-r2},${-r2}z`;
};

// SVG Hexagon Primitive
const HEXAGON$1 = (cx, cy, r) => {
    const r2 = r / 2;
    const r23 = r2 * SquareRootOfThree;
    return `M${cx},${cy -
    r}l${r23},${r2}v${r}l${-r23},${r2},${-r23},${-r2}v${-r}z`;
};

// SVG Cross Primitive
const CROSS$1 = (cx, cy, r, b) => {
    return `M${cx - r / 2},${cy - b -
    r / 2}h${r}v${b}h${b}v${r}h${-b}v${b}h${-r}v${-b}h${-b}v${-r}h${b}z`
};

class Hexagons extends BaseShapes {
    static get ShapeName() { return 'hexagons'; }

    /**
     * process pixels from image
     */
    processPixels() {
        let x = 0;
        let y = 0;
        let odd = true;
        while (y < this.H) {
            this.pushToBucket(x, y);
            x += this.A;
            if (x > this.W) {
                y += (this.A / 2) * SquareRootOfThree;
                x = (this.A / 2) * odd;
                odd = !odd;
            }
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        return this.A * Math.sqrt(wantRate / 3);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        HEXAGON(this.outputCanvasContext, cx, cy, r);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return HEXAGON$1(cx, cy, r);
    }
}

class Circles extends BaseShapes {
    static get ShapeName() { return 'circles'; }

    /**
     * process pixels from image
     */
    processPixels() {
        let x = 0;
        let y = 0;
        let odd = true;
        while (y < this.H) {
            this.pushToBucket(x, y);
            x += this.A;
            if (x > this.W) {
                y += (this.A / 2) * SquareRootOfThree;
                x = (this.A / 2) * odd;
                odd = !odd;
            }
        }
    }

    calculateR(wantRate) {
        const d = (36 * (Math.PI - 2 * SquareRootOfThree)) / (this.A ** 2 * 2 * SquareRootOfThree * (3 - 2 * SquareRootOfThree) ** 2);
        const k = (this.A ** 2 * SquareRootOfThree) / 2 / Math.PI;
        const k2 = (this.A * SquareRootOfThree) / 3;
        return wantRate < Math.PI / (2 * SquareRootOfThree)
            ? Math.sqrt(wantRate * k)
            : (2 * k2 * d +
            Math.sqrt(
                4 * k2 ** 2 * d ** 2 - 4 * d * (d * k2 ** 2 + 1 - wantRate)
            )) /
            (2 * d);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return CIRCLE$1(cx, cy, r);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        CIRCLE(this.outputCanvasContext, cx, cy, r);
    }
}

class CircularDots extends BaseShapes {
    static get ShapeName() { return 'circulardots'; }

    /**
     * process pixels from image
     */
    processPixels() {
        const cx = this.W / 2;
        const cy = this.H / 2;
        const rmax = Math.hypot(cx, cy);
        let r = this.A;
        let n = 6;
        this.pushToBucket(cx, cy);
        while (r < rmax) {
            const α = (2 * Math.PI) / n;
            for (let i = 0; i < n; i++) {
                const x = cx + r * Math.cos(α * i);
                const y = cy + r * Math.sin(α * i);
                this.pushToBucket(x, y);
            }
            r += (this.A * SquareRootOfThree) / 2;
            n += 6;
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        const d = (36 * (Math.PI - 2 * SquareRootOfThree)) / (this.A ** 2 * 2 * SquareRootOfThree * (3 - 2 * SquareRootOfThree) ** 2);
        const k = (this.A ** 2 * SquareRootOfThree) / 2 / Math.PI;
        const k2 = (this.A * SquareRootOfThree) / 3;

        return wantRate < Math.PI / (2 * SquareRootOfThree)
                ? Math.sqrt(wantRate * k)
                : (2 * k2 * d +
                Math.sqrt(
                    4 * k2 ** 2 * d ** 2 - 4 * d * (d * k2 ** 2 + 1 - wantRate)
                )) /
                (2 * d);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return CIRCLE$1(cx, cy, r);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        CIRCLE(this.outputCanvasContext, cx, cy, r);
    }
}

class SunflowerDots extends BaseShapes {
    static get ShapeName() { return 'sunflowerdots'; }

    /**
     * process pixels from image
     */
    processPixels() {
        const cx = this.W / 2;
        const cy = this.H / 2;
        this.pushToBucket(cx + this.A / 2, cy);
        const θ = Math.PI * (3 - 5 ** .5);
        let n = 0;
        let R = (this.A / 2) * n ** .5;
        let α = n * θ;
        const rmax = Math.hypot(cx, cy);
        while (R < rmax) {
            const x = cx + R * Math.cos(α);
            const y = cy + R * Math.sin(α);
            this.pushToBucket(x, y);
            n++;
            R = (this.A / 2) * n ** .5;
            α = n * θ;
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        const d = (36 * (Math.PI - 2 * SquareRootOfThree)) / (this.A ** 2 * 2 * SquareRootOfThree * (3 - 2 * SquareRootOfThree) ** 2);
        const k = (this.A ** 2 * SquareRootOfThree) / 2 / Math.PI;
        const k2 = (this.A * SquareRootOfThree) / 3;

        return wantRate < Math.PI / (2 * SquareRootOfThree)
            ? Math.sqrt(wantRate * k)
            : (2 * k2 * d +
            Math.sqrt(
                4 * k2 ** 2 * d ** 2 - 4 * d * (d * k2 ** 2 + 1 - wantRate)
            )) /
            (2 * d);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return CIRCLE$1(cx, cy, r);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        CIRCLE(this.outputCanvasContext, cx, cy, r);
    }
}

class AltCircles extends BaseShapes {
    static get ShapeName() { return 'altcircles'; }

    /**
     * process pixels from image
     */
    processPixels() {
        let x = 0;
        let y = 0;
        while (y < this.H) {
            this.pushToBucket(x, y);
            x += this.A;
            if (x > this.W) {
                y += this.A;
                x = 0;
            }
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        const d3 = (Math.PI - 4) / (this.A ** 2 * (3 - 2 * SquareRootOfTwo));
        return wantRate < Math.PI / 4
                ? Math.sqrt((wantRate * this.A ** 2) / Math.PI)
                : (this.A * d3 * SquareRootOfTwo + Math.sqrt(4 * d3 * (wantRate - 1))) / (2 * d3);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return CIRCLE$1(cx, cy, r);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        CIRCLE(this.outputCanvasContext, cx, cy, r);
    }
}

class Squares extends BaseShapes {
    static get ShapeName() { return 'squares'; }

    /**
     * process pixels from image
     */
    processPixels() {
        let x = 0;
        let y = 0;
        while (y < this.H) {
            this.pushToBucket(x, y);
            x += this.A;
            if (x > this.W) {
                y += this.A;
                x = 0;
            }
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        return this.A * Math.sqrt(wantRate);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        SQUARE(this.outputCanvasContext, cx, cy, r);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return SQUARE$1(cx, cy, r);
    }
}

class Crosses extends BaseShapes {
    static get ShapeName() { return 'crosses'; }

    /**
     * set crossbar length
     * can be done after initializing, unlike the constructor options
     * @param val
     */
    set crossBarLength(val) {
        this.opts.crossBarLength = val;
        if (this.inputSource) {
            this.init();
        }
    }

    get crossBarLength() {
        return this.opts.crossBarLength
    }

    init() {
        super.init();

        if (this.opts.crossBarLength === undefined) {
            this.opts.crossBarLength = this.opts.distanceBetween / 2;
        }

        this.cbarLength = this.opts.crossBarLength / this.scale;
    }
    /**
     * process pixels from image
     */
    processPixels() {
        let x = 0;
        let y = 0;
        let odd = true;
        while (y < this.H) {
            this.pushToBucket(x, y);
            x += this.A;
            if (x > this.W) {
                y += (this.A / 4) * 3;
                x = (this.A / 2) * odd;
                odd = !odd;
            }
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        return (this.A *
            Math.sqrt(
                this.cbarLength ** 2 + 2.25 * this.A ** 2 * wantRate - 3 * this.A * this.cbarLength * wantRate
            ) -
            this.A * this.cbarLength) /
            (3 * this.A - 4 * this.cbarLength);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        const a = Round(this.A * this.scale);
        const c = Round(this.cbarLength * this.scale);
        const b = (r * (a - c)) / a + (c - r) / 2;
        CROSS(this.outputCanvasContext, cx, cy, r, b);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        const a = Round(this.A * this.scale);
        const c = Round(this.cbarLength * this.scale);
        const b = (r * (a - c)) / a + (c - r) / 2;
        return CROSS$1(cx, cy, r, b);
    }
}

class Triangles extends BaseShapes {
    static get ShapeName() { return 'triangles'; }

    preInit() {
        this.processRow = true;
        this.processCol = true;
        this.outputRow = -1;
        this.outputCol = -1;
    }

    /**
     * process pixels from image
     */
    processPixels() {
        let x = 0;
        let y = 0;
        this.processRow = true;
        this.processCol = true;
        let Y = y;
        while (y < this.H) {
            this.pushToBucket(x, y);
            x += (this.A * SquareRootOfThree) / 2;
            y = y + (this.A / 2) * (this.processCol ? -1 : 1);
            this.processCol = !this.processCol;
            if (x > this.W) {
                y = Y + this.A * (this.processRow ? 1 : 2);
                Y = y;
                x = 0;
                this.processRow = !this.processRow;
                this.processCol = this.processRow;
            }
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        return (3 / 2) * this.A * Math.sqrt(wantRate);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return this.renderCommonShape('svg', cx, cy, r);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        this.renderCommonShape('bitmap', cx, cy, r);
    }

    renderCommonShape(type, cx, cy, r) {
        if (!cx) {
            this.outputRow++;
            this.outputCol = -1;
        }
        this.outputCol ++;
        if ((this.outputCol + this.outputRow) % 2) {
            if (type === 'svg') {
                return TRIANGLE$1(cx, cy, r, 1);
            } else {
                TRIANGLE(this.outputCanvasContext, cx, cy, r, 1);
            }
        } else {
            if (type === 'svg') {
                return TRIANGLE$1(cx, cy, r, -1);
            } else {
                TRIANGLE(this.outputCanvasContext, cx, cy, r, -1);
            }
        }
    }
}

class AltTriangles extends BaseShapes {
    static get ShapeName() { return 'alttriangles'; }

    preInit() {
        this.processRow = true;
        this.processCol = true;
        this.outputRow = -1;
        this.outputCol = -1;
    }

    /**
     * process pixels from image
     */
    processPixels() {
        let x = 0;
        let y = 0;
        this.processCol = true;
        let Y = y;
        while (y < this.H) {
            this.pushToBucket(x, y);
            x += (this.A * SquareRootOfThree) / 2;
            y = y + (this.A / 2) * (this.processCol ? -1 : 1);
            this.processCol = !this.processCol;
            if (x > this.W) {
                y = Y + this.A * 1.5;
                Y = y;
                x = 0;
                this.processCol = true;
            }
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        return (3 / 2) * this.A * Math.sqrt(wantRate);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return this.renderCommonShape('svg', cx, cy, r);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        this.renderCommonShape('bitmap', cx, cy, r);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderCommonShape(type, cx, cy, r) {
        if (!cx) {
            this.outputRow++;
            this.outputCol = -1;
        }
        this.outputCol++;
        if (this.outputCol % 2) {
            if (type === 'svg') {
                return TRIANGLE$1(cx, cy, r, 1);
            } else {
                TRIANGLE(this.outputCanvasContext, cx, cy, r, 1);
            }
        } else {
            if (type === 'svg') {
                return TRIANGLE$1(cx, cy, r, -1);
            } else {
                TRIANGLE(this.outputCanvasContext, cx, cy, r, -1);
            }
        }
    }
}

class Diamonds extends BaseShapes {
    static get ShapeName() { return 'diamonds'; }

    /**
     * process pixels from image
     */
    processPixels() {
        let x = 0;
        let y = 0;
        let odd = true;
        while (y < this.H) {
            this.pushToBucket(x, y);
            x += this.A * SquareRootOfTwo;
            if (x > this.W) {
                y += this.A / SquareRootOfTwo;
                x = odd ? this.A / SquareRootOfTwo : 0;
                odd = !odd;
            }
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        return this.A * Math.sqrt( wantRate );
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return DIAMOND$1(cx, cy, r);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        DIAMOND(this.outputCanvasContext, cx, cy, r);
    }
}

class Waves extends BaseShapes {
    static get ShapeName() { return 'waves'; }

    /**
     * process pixels from image
     */
    processPixels() {
        let x = 0;
        let y = 0;
        while (y < this.H + this.A) {
            this.pushToBucket(x, y + Math.sin(x / 4));
            x += this.A;
            if (x > this.W) {
                y += this.A;
                x = 0;
            }
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        const d3 = (Math.PI - 4) / (this.A ** 2 * (3 - 2 * SquareRootOfTwo));
        return wantRate < Math.PI / 4
            ? Math.sqrt((wantRate * this.A ** 2) / Math.PI)
            : (this.A * d3 * SquareRootOfTwo + Math.sqrt(4 * d3 * (wantRate - 1))) / (2 * d3);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return CIRCLE$1(cx, cy, r);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        CIRCLE(this.outputCanvasContext, cx, cy, r);
    }
}

class AltSquares extends BaseShapes {
    static get ShapeName() { return 'altsquares'; }

    /**
     * process pixels from image
     */
    processPixels() {
        let x = 0;
        let y = 0;
        let odd = true;
        while (y < this.H) {
            this.pushToBucket(x, y);
            x += this.A;
            if (x > this.W) {
                y += this.A;
                x = (this.A / 2) * odd;
                odd = !odd;
            }
        }
    }

    /**
     * calculate radius? Is this what R is?
     * @param wantRate
     */
    calculateR(wantRate) {
        return this.A * Math.sqrt(wantRate);
    }

    /**
     * render bitmap shape
     * @param cx
     * @param cy
     * @param r
     */
    renderBitmapShape(cx, cy, r) {
        SQUARE(this.outputCanvasContext, cx, cy, r);
    }

    /**
     * render SVG shape
     * @param cx
     * @param cy
     * @param r
     */
    renderSVGShape(cx, cy, r) {
        return SQUARE$1(cx, cy, r);
    }
}

var Shapes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Hexagons: Hexagons,
    Circles: Circles,
    CircularDots: CircularDots,
    SunflowerDots: SunflowerDots,
    AltCircles: AltCircles,
    Squares: Squares,
    Crosses: Crosses,
    Triangles: Triangles,
    AltTriangles: AltTriangles,
    Diamonds: Diamonds,
    Waves: Waves,
    AltSquares: AltSquares
});

const RendererFactory = (type, opts, imageobj) => {
    const ctor = Object.entries(Shapes).find( item => {
        return item[1].ShapeName === type;
    })[1];

    return new ctor(opts, imageobj);
};

const RenderShapeTypes = Object.entries(Shapes).map(item => {
    return item[1].ShapeName;
});

class BaseHalftoneElement extends HTMLElement {
    static get RenderShapeTypes() { return RenderShapeTypes }

    static get observedAttributes() { return [
        'src',
        'shapetype',
        'distance',
        'crossbarlength',
        'shapecolor',
        'refreshrate',
        'blendmode' ];
    }

    loadImage(uri) {
        this.inputSource = new Image();
        this.inputSource.addEventListener('load', e => {
            if (this.renderer) {
                this.renderer.input = this.inputSource;
                this.resize();
                this.render();
            }
        });
        this.inputSource.src = uri;
    }

    set distanceBetween(val) {
        if (this.renderer) {
            this.renderer.distanceBetween = val;
        }
    }

    get distanceBetween() {
        return this.renderer ? this.renderer.distanceBetween : undefined;
    }

    constructor() {
        super();
        if (!this.hasAttribute('noshadow')) {
            this.domRoot = this.attachShadow( { mode: 'open'});
        }
        this.style.position = 'relative';
        this.style.display = 'inline-block';

        /**
         * visible area bounding box
         * whether letterboxed or cropped, will report visible video area
         * @type {{x: number, y: number, width: number, height: number}}
         */
        this.visibleRect = { x: 0, y: 0, width: 0, height: 0 };

        /**
         *  total component width
         */
        this.componentWidth = undefined;

        /**
         *  total component height
         */
        this.componentHeight = undefined;

        /**
         *  renderer aspect ratio
         */
        this.componentHeight = undefined;

        /**
         * slot for inserting a background layer sized to the rendered halftone
         */
        this.backgroundSlot = undefined;

        /**
         * surface for halftone rendering
         */
        this.halftoneSurface = undefined;

        /**
         * refresh rate for input sources that change (like video)
         */
        this.refreshRate = 150;

        this.createBackgroundSlot();
        this.createRenderer();

        if (this.getAttribute('src')) {
            const source = this.getAttribute('src');
            if (source === 'camera') {
                this.startCamera();
            } else {
                this.loadImage(source);
            }
        }
    }

    get renderSurface() {
        return this.halftoneSurface;
    }

    get contentWidth() {
        return this.visibleRect.width;
    }

    get contentHeight() {
        return this.visibleRect.height;
    }

    /**
     * update canvas dimensions when resized
     * @return modified
     */
    resize() {
        const bounds = this.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) {
            return false;
        }

        if (bounds.width === this.componentWidth &&
            bounds.height === this.componentHeight &&
            this.sourceAspectRatio === this.renderer.aspectRatio) {
            return false;
        }

        this.componentWidth = bounds.width;
        this.componentHeight = bounds.height;
        let renderWidth = bounds.width;
        let renderHeight = bounds.height;
        const componentAspectRatio = bounds.width / bounds.height;
        this.sourceAspectRatio = this.renderer.aspectRatio;

        // calculate letterbox borders
        if (componentAspectRatio < this.renderer.aspectRatio) {
            renderHeight = bounds.width / this.renderer.aspectRatio;
            this.letterBoxTop = bounds.height / 2 - renderHeight / 2;
            this.letterBoxLeft = 0;
        } else if (componentAspectRatio > this.renderer.aspectRatio) {
            renderWidth = bounds.height * this.renderer.aspectRatio;
            this.letterBoxLeft = bounds.width/2 - renderWidth / 2;
            this.letterBoxTop = 0;
        } else {
            this.letterBoxTop = 0;
            this.letterBoxLeft = 0;
        }

        this.visibleRect.x = this.letterBoxLeft;
        this.visibleRect.y = this.letterBoxTop;
        this.visibleRect.width = renderWidth;
        this.visibleRect.height = renderHeight;

        this.backgroundSlot.style.width = `${this.visibleRect.width}px`;
        this.backgroundSlot.style.height = `${this.visibleRect.height}px`;
        this.backgroundSlot.style.top = `${this.visibleRect.y}px`;
        this.backgroundSlot.style.left = `${this.visibleRect.x}px`;

        this.halftoneSurface.style.top = this.visibleRect.y + 'px';
        this.halftoneSurface.style.left = this.visibleRect.x + 'px';
        this.halftoneSurface.style.width = this.visibleRect.width + 'px';
        this.halftoneSurface.style.height = this.visibleRect.height + 'px';
        return true;
    };

    connectedCallback() {
        if (this.hasAttribute('noshadow')) {
            this.domRoot = this;
        }

        this.domRoot.appendChild(this.backgroundSlot);
        this.resize();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'shapetype':
                if (this.renderer.rendererType !== newValue) {
                    this.createRenderer(this.renderer.inputSource);
                    this.render();
                }
                return;

            case 'distance':
                this.renderer.distanceBetween = newValue;
                this.render();
                return;

            case 'crossbarlength':
                if (this.renderer.rendererType === 'crosses') {
                    this.renderer.crossBarLength = newValue;
                    this.render();
                }
                return;

            case 'src':
                this.cleanup();
                if (newValue === 'camera') {
                    this.startCamera();
                } else {
                    this.loadImage(newValue);
                }
                break;

            case 'blendmode':
                this.halftoneSurface.style['mix-blend-mode'] = newValue;
                break;

            case 'refreshrate':
                this.refreshRate = newValue;
                if (this._timer) {
                    clearInterval(this._timer);
                    this._timer = setInterval( () => {
                        this.render();
                    }, this.refreshRate);
                }
        }
    }

    render() {}

    async startCamera() {
        this.inputSource = document.createElement('video');
        this._stream = await navigator.mediaDevices.getUserMedia({
            'audio': false,
            'video': {
                width: this.width,
                height: this.height,
            },
        });

        this.inputSource.onloadedmetadata = event => {
            this.renderer.input = this.inputSource;
            this.resize();
        };

        this.inputSource.onplaying = () => {
            this._timer = setInterval( () => {
                this.render();
            }, this.refreshRate);
        };

        this.inputSource.srcObject = this._stream;
        this.inputSource.play();
    }

    createRendererOptions() {
        const opts = { inputSource: this.inputSource };
        if (this.hasAttribute('benchmark')) {
            opts.benchmark = true;
        }
        if (this.hasAttribute('distance')) {
            opts.distanceBetween = Number(this.getAttribute('distance'));
        }
        return opts;
    }

    createRenderer(input) {
        const type = this.hasAttribute('shapetype') ? this.getAttribute('shapetype') : 'circles';
        this.renderer = RendererFactory(type, this.createRendererOptions(), input);
    }

    createBackgroundSlot() {
        this.backgroundSlot = document.createElement('slot');
        this.backgroundSlot.style.position = 'absolute';
        this.backgroundSlot.style.display = 'inline-block';
    }

    cleanup() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
        if (this._stream) {
            const tracks = this._stream.getTracks();
            tracks.forEach( track => {
                track.stop();
            });
            this._stream = undefined;
        }
    }
}

class HalftoneBitmap extends BaseHalftoneElement {
    static get rendererType() { return 'canvas'; }

    connectedCallback() {
        super.connectedCallback();
        this.domRoot.appendChild(this.halftoneSurface);
    }

    resize() {
        const modified = super.resize();
        if (modified) {
            this.renderer.setCanvasOutputSize(this.visibleRect.width, this.visibleRect.height);
        }
        return modified;
    }

    render() {
        if (this.renderer && this.renderer.isSourceReady) {
            this.renderer.outputCanvasContext.clearRect(0, 0, this.renderer.outputCanvas.width, this.renderer.outputCanvas.height);
            const fillColor = this.hasAttribute('shapecolor') ? this.getAttribute('shapecolor') : 'black';

            this.renderer.outputCanvasContext.fillStyle = fillColor;
            this.renderer.render(this.getAttribute('src') === 'camera');
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        switch (name) {
            case 'shapecolor':
                this.render();
                break;
        }
    }

    createRendererOptions() {
        const opts = super.createRendererOptions();

        if (!this.halftoneSurface) {
            this.halftoneSurface = document.createElement('canvas');
            this.halftoneSurface.style.position = 'absolute';
        }

        opts.renderer = 'canvas';
        opts.outputCanvas = this.halftoneSurface;
        opts.outputSize = this.renderer?.opts.outputSize ? this.renderer?.opts.outputSize : { width: 0, height: 0 };
        return opts;
    }
}

if (!customElements.get('halftone-bitmap')) {
    customElements.define('halftone-bitmap', HalftoneBitmap);
}

class HalftoneSVG extends BaseHalftoneElement {
    connectedCallback() {
        super.connectedCallback();
        this.domRoot.appendChild(this.halftoneSurface);
    }

    /**
     * render
     * @param dorender - default true, allow not invoking the underlying render function
     */
    render(dorender = true) {
        if (this.renderer && this.renderer.isSourceReady) {
            if (dorender) {
                this.cachedSVGPath = this.renderer.render( this.getAttribute('src') === 'camera');
            }
            this.halftoneSurface.innerHTML = this.svgPathWithTransformGroup;
        }
    }

    /**
     * get SVG markup
     * @return string
     */
    getSVG(width, height) {
        return `<svg width="${width | this.visibleRect.width}" height="${height | this.visibleRect.height}" xmlns="http://www.w3.org/2000/svg">
            ${this.svgPathWithTransformGroup}
        </svg>`;
    }

    /**
     * get SVG path data from last render
     */
    get svgPath() {
        return this.cachedSVGPath;
    }

    /**
     * get SVG path with surrounding transform group
     */
    get svgPathWithTransformGroup() {
        const fill = this.hasAttribute('shapecolor') ? this.getAttribute('shapecolor') : 'black';
        return `<g fill="${fill}" transform="scale(${this.visibleRect.width / this.renderer.width}, ${this.visibleRect.height / this.renderer.height})">
            <path d="${this.svgPath}"></path>
        </g>`;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        switch (name) {
            case 'shapecolor':
                this.render(false);
                break;
        }
    }

    createRendererOptions() {
        const opts = super.createRendererOptions();

        if (!this.halftoneSurface) {
            this.halftoneSurface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.halftoneSurface.style.position = 'absolute';
            this.halftoneSurface.style.display = 'inline-block';
        }

        opts.renderer = 'svgpath';
        return opts;
    }
}

if (!customElements.get('halftone-svg')) {
    customElements.define('halftone-svg', HalftoneSVG);
}

const template = function(scope) { return html`        
<halftone-svg blendmode="overlay" src="${scope.foregroundImage}">
    <div id="bgimage" style="background-image: url(${scope.backgroundImage})"></div>
</halftone-svg>

<div id="button-row">
    ${scope.mode === 'complete' ?  html`
                <sp-button variant="primary" @click="${() => scope.upload()}">Upload to Gallery</sp-button>
                <sp-button variant="primary" @click="${() => scope.onDownloadImage()}">Download</sp-button>
                <sp-button @click="${() => scope.nextStep()}">Remix Again</sp-button>` : html`
                <input type="file" id="backgroundimage" @change=${(e) => scope.onLocalImage(e) } name="img" accept="image/*">
                <sp-button variant="primary" @click="${() => scope.nextImage()}">Try another</sp-button>
                <sp-button variant="primary" @click="${() => scope.uploadImage()}">Upload a file</sp-button>
                ${scope.mode === 'foreground' ? 
                        html`<sp-button variant="primary" 
                                        @click="${() => scope.onCameraClick()}">
                            ${scope.foregroundImage === 'camera' ? 'Snap picture' : 'Use my camera'}
                        </sp-button>` : nothing }
                <sp-button @click="${() => scope.nextStep()}">Next</sp-button>
    `}
</div>
`};

const downloadImage = (htComponent, backgroundImage) => {
    let rendered = false;
    const imgA = document.createElement('img');
    const imgB = document.createElement('img');
    let svg64 = btoa(htComponent.getSVG());
    let b64Start = 'data:image/svg+xml;base64,';
    let image64 = b64Start + svg64;

    const composite = () => {
        if (!rendered && imgA.complete && (imgB.complete || backgroundImage)) {
            const canvas = document.createElement('canvas');
            canvas.width = htComponent.contentWidth;
            canvas.height = htComponent.contentHeight;
            const ctx = canvas.getContext('2d');

            ctx.globalCompositeOperation = 'normal';
            if (backgroundImage) {
                drawBackgroundImage(ctx, imgB);
            }
            ctx.globalCompositeOperation = 'overlay'; //blendMode;
            ctx.drawImage(imgA, 0, 0);
            downloadCanvasAsImage(canvas);
            rendered = true;
        }
    };

    imgA.onload = () => composite();
    imgB.onload = () => composite();

    imgA.src = image64;
    if (backgroundImage) {
        imgB.src = backgroundImage;
    }
};

const svgToImage = async (htComponent) => {
    const img = document.createElement('img');
    let svg64 = btoa(htComponent.getSVG());
    let b64Start = 'data:image/svg+xml;base64,';
    let image64 = b64Start + svg64;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = htComponent.contentWidth;
        canvas.height = htComponent.contentHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL();
    };
    img.src = image64;
};

const downloadCanvasAsImage = (canvas) => {
    const pngdata = canvas.toDataURL('image/png');
    const dl = document.createElement('a');
    dl.setAttribute('download', 'halftone.png');
    dl.setAttribute('href', pngdata);
    dl.click();
};


const drawBackgroundImage = (ctx, srccanvas, offsetX = 0.5, offsetY = 0.5) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // keep bounds [0.0, 1.0]
    if (offsetX < 0) offsetX = 0;
    if (offsetY < 0) offsetY = 0;
    if (offsetX > 1) offsetX = 1;
    if (offsetY > 1) offsetY = 1;

    var iw = srccanvas.width,
        ih = srccanvas.height,
        r = Math.min(w / iw, h / ih),
        nw = iw * r,   // new prop. width
        nh = ih * r,   // new prop. height
        cx, cy, cw, ch, ar = 1;

    // decide which gap to fill
    if (nw < w) ar = w / nw;
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;  // updated
    nw *= ar;
    nh *= ar;

    // calc source rectangle
    cw = iw / (nw / w);
    ch = ih / (nh / h);

    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    // make sure source rectangle is valid
    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    // fill image in dest. rectangle
    ctx.drawImage(srccanvas, cx, cy, cw, ch, 0, 0, w, h);
};

const style = css`
    :host {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
    }
    
    halftone-svg {
      width: 100%;
      height: calc(100% - 175px);
      display: inline-block;
    }
  
    #bgimage {
      width: 100%; 
      height: 100%;
      display: inline-block;
      background-position: center;
      background-size: cover;
    }

  #button-row {
      margin-left: auto;
      margin-top: 15px;
      display: flex;
    }

    #button-row sp-button {
      margin-right: 15px;
    }

    #button-row input {
      display: none;
    }
`;

class LayerChooser extends LitElement {
    static get styles() {
        return [style];
    }

    static get properties() {
        return {
            mode: { type: String },
        };
    }

    constructor() {
        super();

        /**
         * background image
         * @type {string} url
         */
        this.backgroundImage = undefined;

        /**
         * foreground image
         * @type {string} url
         */
        this.foregroundImage = '';

        /**
         * image index
         */
        this.imageIndex = 0;

        this.data = [
            './sampleimages/sample1.jpeg',
            './sampleimages/sample2.jpeg',
            './sampleimages/sample3.jpeg',
            './sampleimages/sample4.jpeg',
            './sampleimages/sample5.jpeg',
            './sampleimages/sample6.jpeg',
            './sampleimages/sample7.jpeg'
        ];

        // needs to be async because mode isn't an attribute yet
        // however, once this is data connected, the problem will
        // solve itself
        requestAnimationFrame(() => {
            this.nextImage();
        });
    }


    nextImage() {
        this.imageIndex ++;
        if (this.imageIndex >= this.data.length) {
            this.imageIndex = 0;
        }
        if (this.mode === 'background') {
            this.backgroundImage = this.data[this.imageIndex];
        } else {
            this.foregroundImage = this.data[this.imageIndex];
        }
        this.requestUpdate();
    }

    uploadImage() {
        this.shadowRoot.querySelector('input').click();
    }

    async onCameraClick() {
        if (this.foregroundImage === 'camera') {
            this.foregroundImage = await svgToImage(this.shadowRoot.querySelector('halftone-svg'));
        } else {
            this.foregroundImage = 'camera';
        }
        this.requestUpdate();
    }

    onDownloadImage() {
        downloadImage(this.shadowRoot.querySelector('halftone-svg'), this.backgroundImage);
    }

    onLocalImage(e) {
        if (this.mode === 'background') {
            this.backgroundImage = URL.createObjectURL(e.target.files[0]);
        } else {
            this.foregroundImage = URL.createObjectURL(e.target.files[0]);
        }
        this.requestUpdate();
    }

    nextStep() {
        switch (this.mode) {
            case 'background':
                this.imageIndex = 0;
                this.mode = 'foreground';
                this.nextImage();
                break;


            case 'foreground':
                this.mode = 'complete';
                break;

            case 'complete':
                this.mode = 'background';
                break;
        }

        const ce = new CustomEvent('modechange', { detail: this.mode, composed: true, bubbles: true });
        this.dispatchEvent(ce);
        this.requestUpdate();
    }

    render() {
        return template(this);
    }
}

customElements.define('remix-layer-chooser', LayerChooser);

const template$1 = function(scope) { return html`

<sp-theme scale="medium" color="light">
    Choose a
    <sp-tabs selected="${scope.mode}" @change=${(e) => scope.onTabChange(e)}>
        <sp-tab label="Background" value="background"></sp-tab>
        <sp-tab label="Foreground" value="foreground"></sp-tab>
    </sp-tabs>
    <remix-layer-chooser mode="${scope.mode}"></remix-layer-chooser>
</sp-theme>
`};

const style$1 = css`
:host {
    height: 100vh;
    width: 100vw;
    display: inline-block;
}
  
sp-theme {
  height: 100%;
  width: 100%;
}  
`;

// global fix for dropdown popper JS in Spectrum Web Components
window.process = { env : { NODE_ENV: 'nothing' }};

class App extends LitElement {
    static get styles() {
        return [style$1];
    }

    static get properties() {
        return {
            mode: { type: String },
        };
    }

    constructor() {
        super();

        this.addEventListener('modechange', (e) => {
            this.mode = e.detail;
            this.requestUpdate('mode');
        });

        /**
         * application mode (background selection, foreground selection, or complete)
         */
        this.mode = 'background';
    }

    onTabChange(e) {
        this.mode = e.target.selected;
        this.requestUpdate('mode');
    }
    render() {
        return template$1(this);
    }
}

customElements.define('remix-app', App);

export default App;
