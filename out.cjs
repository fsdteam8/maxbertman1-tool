"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) =>
  function __require() {
    return (
      mod ||
        (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod),
      mod.exports
    );
  };
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod,
  )
);

// node_modules/react/cjs/react.production.js
var require_react_production = __commonJS({
  "node_modules/react/cjs/react.production.js"(exports2) {
    "use strict";
    var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for(
      "react.transitional.element",
    );
    var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE =
      /* @__PURE__ */ Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE =
      /* @__PURE__ */ Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense");
    var REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo");
    var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
    var REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable)
        return null;
      maybeIterable =
        (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
        maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    var ReactNoopUpdateQueue = {
      isMounted: function () {
        return false;
      },
      enqueueForceUpdate: function () {},
      enqueueReplaceState: function () {},
      enqueueSetState: function () {},
    };
    var assign = Object.assign;
    var emptyObject = {};
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function (partialState, callback) {
      if (
        "object" !== typeof partialState &&
        "function" !== typeof partialState &&
        null != partialState
      )
        throw Error(
          "takes an object of state variables to update or a function which returns an object of state variables.",
        );
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function (callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    function ComponentDummy() {}
    ComponentDummy.prototype = Component.prototype;
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    var pureComponentPrototype = (PureComponent.prototype =
      new ComponentDummy());
    pureComponentPrototype.constructor = PureComponent;
    assign(pureComponentPrototype, Component.prototype);
    pureComponentPrototype.isPureReactComponent = true;
    var isArrayImpl = Array.isArray;
    function noop() {}
    var ReactSharedInternals = { H: null, A: null, T: null, S: null };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function ReactElement(type, key, props) {
      var refProp = props.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== refProp ? refProp : null,
        props,
      };
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      return ReactElement(oldElement.type, newKey, oldElement.props);
    }
    function isValidElement(object) {
      return (
        "object" === typeof object &&
        null !== object &&
        object.$$typeof === REACT_ELEMENT_TYPE
      );
    }
    function escape(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return (
        "$" +
        key.replace(/[=:]/g, function (match) {
          return escaperLookup[match];
        })
      );
    }
    var userProvidedKeyEscapeRegex = /\/+/g;
    function getElementKey(element, index) {
      return "object" === typeof element &&
        null !== element &&
        null != element.key
        ? escape("" + element.key)
        : index.toString(36);
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch (
            ("string" === typeof thenable.status
              ? thenable.then(noop, noop)
              : ((thenable.status = "pending"),
                thenable.then(
                  function (fulfilledValue) {
                    "pending" === thenable.status &&
                      ((thenable.status = "fulfilled"),
                      (thenable.value = fulfilledValue));
                  },
                  function (error) {
                    "pending" === thenable.status &&
                      ((thenable.status = "rejected"),
                      (thenable.reason = error));
                  },
                )),
            thenable.status)
          ) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if ("undefined" === type || "boolean" === type) children = null;
      var invokeCallback = false;
      if (null === children) invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return (
                  (invokeCallback = children._init),
                  mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback,
                  )
                );
            }
        }
      if (invokeCallback)
        return (
          (callback = callback(children)),
          (invokeCallback =
            "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar),
          isArrayImpl(callback)
            ? ((escapedPrefix = ""),
              null != invokeCallback &&
                (escapedPrefix =
                  invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") +
                  "/"),
              mapIntoArray(callback, array, escapedPrefix, "", function (c) {
                return c;
              }))
            : null != callback &&
              (isValidElement(callback) &&
                (callback = cloneAndReplaceKey(
                  callback,
                  escapedPrefix +
                    (null == callback.key ||
                    (children && children.key === callback.key)
                      ? ""
                      : ("" + callback.key).replace(
                          userProvidedKeyEscapeRegex,
                          "$&/",
                        ) + "/") +
                    invokeCallback,
                )),
              array.push(callback)),
          1
        );
      invokeCallback = 0;
      var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0; i < children.length; i++)
          ((nameSoFar = children[i]),
            (type = nextNamePrefix + getElementKey(nameSoFar, i)),
            (invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback,
            )));
      else if (((i = getIteratorFn(children)), "function" === typeof i))
        for (
          children = i.call(children), i = 0;
          !(nameSoFar = children.next()).done;
        )
          ((nameSoFar = nameSoFar.value),
            (type = nextNamePrefix + getElementKey(nameSoFar, i++)),
            (invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback,
            )));
      else if ("object" === type) {
        if ("function" === typeof children.then)
          return mapIntoArray(
            resolveThenable(children),
            array,
            escapedPrefix,
            nameSoFar,
            callback,
          );
        array = String(children);
        throw Error(
          "Objects are not valid as a React child (found: " +
            ("[object Object]" === array
              ? "object with keys {" + Object.keys(children).join(", ") + "}"
              : array) +
            "). If you meant to render a collection of children, use an array instead.",
        );
      }
      return invokeCallback;
    }
    function mapChildren(children, func, context) {
      if (null == children) return children;
      var result = [],
        count = 0;
      mapIntoArray(children, result, "", "", function (child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ctor = payload._result;
        ctor = ctor();
        ctor.then(
          function (moduleObject) {
            if (0 === payload._status || -1 === payload._status)
              ((payload._status = 1), (payload._result = moduleObject));
          },
          function (error) {
            if (0 === payload._status || -1 === payload._status)
              ((payload._status = 2), (payload._result = error));
          },
        );
        -1 === payload._status &&
          ((payload._status = 0), (payload._result = ctor));
      }
      if (1 === payload._status) return payload._result.default;
      throw payload._result;
    }
    var reportGlobalError =
      "function" === typeof reportError
        ? reportError
        : function (error) {
            if (
              "object" === typeof window &&
              "function" === typeof window.ErrorEvent
            ) {
              var event = new window.ErrorEvent("error", {
                bubbles: true,
                cancelable: true,
                message:
                  "object" === typeof error &&
                  null !== error &&
                  "string" === typeof error.message
                    ? String(error.message)
                    : String(error),
                error,
              });
              if (!window.dispatchEvent(event)) return;
            } else if (
              "object" === typeof process &&
              "function" === typeof process.emit
            ) {
              process.emit("uncaughtException", error);
              return;
            }
            console.error(error);
          };
    var Children = {
      map: mapChildren,
      forEach: function (children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function () {
            forEachFunc.apply(this, arguments);
          },
          forEachContext,
        );
      },
      count: function (children) {
        var n = 0;
        mapChildren(children, function () {
          n++;
        });
        return n;
      },
      toArray: function (children) {
        return (
          mapChildren(children, function (child) {
            return child;
          }) || []
        );
      },
      only: function (children) {
        if (!isValidElement(children))
          throw Error(
            "React.Children.only expected to receive a single React element child.",
          );
        return children;
      },
    };
    exports2.Activity = REACT_ACTIVITY_TYPE;
    exports2.Children = Children;
    exports2.Component = Component;
    exports2.Fragment = REACT_FRAGMENT_TYPE;
    exports2.Profiler = REACT_PROFILER_TYPE;
    exports2.PureComponent = PureComponent;
    exports2.StrictMode = REACT_STRICT_MODE_TYPE;
    exports2.Suspense = REACT_SUSPENSE_TYPE;
    exports2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE =
      ReactSharedInternals;
    exports2.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function (size) {
        return ReactSharedInternals.H.useMemoCache(size);
      },
    };
    exports2.cache = function (fn) {
      return function () {
        return fn.apply(null, arguments);
      };
    };
    exports2.cacheSignal = function () {
      return null;
    };
    exports2.cloneElement = function (element, config, children) {
      if (null === element || void 0 === element)
        throw Error(
          "The argument must be a React element, but you passed " +
            element +
            ".",
        );
      var props = assign({}, element.props),
        key = element.key;
      if (null != config)
        for (propName in (void 0 !== config.key && (key = "" + config.key),
        config))
          !hasOwnProperty.call(config, propName) ||
            "key" === propName ||
            "__self" === propName ||
            "__source" === propName ||
            ("ref" === propName && void 0 === config.ref) ||
            (props[propName] = config[propName]);
      var propName = arguments.length - 2;
      if (1 === propName) props.children = children;
      else if (1 < propName) {
        for (var childArray = Array(propName), i = 0; i < propName; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      return ReactElement(element.type, key, props);
    };
    exports2.createContext = function (defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null,
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue,
      };
      return defaultValue;
    };
    exports2.createElement = function (type, config, children) {
      var propName,
        props = {},
        key = null;
      if (null != config)
        for (propName in (void 0 !== config.key && (key = "" + config.key),
        config))
          hasOwnProperty.call(config, propName) &&
            "key" !== propName &&
            "__self" !== propName &&
            "__source" !== propName &&
            (props[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (1 === childrenLength) props.children = children;
      else if (1 < childrenLength) {
        for (
          var childArray = Array(childrenLength), i = 0;
          i < childrenLength;
          i++
        )
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in ((childrenLength = type.defaultProps), childrenLength))
          void 0 === props[propName] &&
            (props[propName] = childrenLength[propName]);
      return ReactElement(type, key, props);
    };
    exports2.createRef = function () {
      return { current: null };
    };
    exports2.forwardRef = function (render) {
      return { $$typeof: REACT_FORWARD_REF_TYPE, render };
    };
    exports2.isValidElement = isValidElement;
    exports2.lazy = function (ctor) {
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: { _status: -1, _result: ctor },
        _init: lazyInitializer,
      };
    };
    exports2.memo = function (type, compare) {
      return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare,
      };
    };
    exports2.startTransition = function (scope) {
      var prevTransition = ReactSharedInternals.T,
        currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(),
          onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish &&
          onStartTransitionFinish(currentTransition, returnValue);
        "object" === typeof returnValue &&
          null !== returnValue &&
          "function" === typeof returnValue.then &&
          returnValue.then(noop, reportGlobalError);
      } catch (error) {
        reportGlobalError(error);
      } finally {
        (null !== prevTransition &&
          null !== currentTransition.types &&
          (prevTransition.types = currentTransition.types),
          (ReactSharedInternals.T = prevTransition));
      }
    };
    exports2.unstable_useCacheRefresh = function () {
      return ReactSharedInternals.H.useCacheRefresh();
    };
    exports2.use = function (usable) {
      return ReactSharedInternals.H.use(usable);
    };
    exports2.useActionState = function (action, initialState, permalink) {
      return ReactSharedInternals.H.useActionState(
        action,
        initialState,
        permalink,
      );
    };
    exports2.useCallback = function (callback, deps) {
      return ReactSharedInternals.H.useCallback(callback, deps);
    };
    exports2.useContext = function (Context) {
      return ReactSharedInternals.H.useContext(Context);
    };
    exports2.useDebugValue = function () {};
    exports2.useDeferredValue = function (value, initialValue) {
      return ReactSharedInternals.H.useDeferredValue(value, initialValue);
    };
    exports2.useEffect = function (create, deps) {
      return ReactSharedInternals.H.useEffect(create, deps);
    };
    exports2.useEffectEvent = function (callback) {
      return ReactSharedInternals.H.useEffectEvent(callback);
    };
    exports2.useId = function () {
      return ReactSharedInternals.H.useId();
    };
    exports2.useImperativeHandle = function (ref, create, deps) {
      return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
    };
    exports2.useInsertionEffect = function (create, deps) {
      return ReactSharedInternals.H.useInsertionEffect(create, deps);
    };
    exports2.useLayoutEffect = function (create, deps) {
      return ReactSharedInternals.H.useLayoutEffect(create, deps);
    };
    exports2.useMemo = function (create, deps) {
      return ReactSharedInternals.H.useMemo(create, deps);
    };
    exports2.useOptimistic = function (passthrough, reducer) {
      return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
    };
    exports2.useReducer = function (reducer, initialArg, init) {
      return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
    };
    exports2.useRef = function (initialValue) {
      return ReactSharedInternals.H.useRef(initialValue);
    };
    exports2.useState = function (initialState) {
      return ReactSharedInternals.H.useState(initialState);
    };
    exports2.useSyncExternalStore = function (
      subscribe,
      getSnapshot,
      getServerSnapshot,
    ) {
      return ReactSharedInternals.H.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
      );
    };
    exports2.useTransition = function () {
      return ReactSharedInternals.H.useTransition();
    };
    exports2.version = "19.2.4";
  },
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports2, module2) {
    "use strict";
    "production" !== process.env.NODE_ENV &&
      (function () {
        function defineDeprecationWarning(methodName, info) {
          Object.defineProperty(Component.prototype, methodName, {
            get: function () {
              console.warn(
                "%s(...) is deprecated in plain JavaScript React classes. %s",
                info[0],
                info[1],
              );
            },
          });
        }
        function getIteratorFn(maybeIterable) {
          if (null === maybeIterable || "object" !== typeof maybeIterable)
            return null;
          maybeIterable =
            (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
            maybeIterable["@@iterator"];
          return "function" === typeof maybeIterable ? maybeIterable : null;
        }
        function warnNoop(publicInstance, callerName) {
          publicInstance =
            ((publicInstance = publicInstance.constructor) &&
              (publicInstance.displayName || publicInstance.name)) ||
            "ReactClass";
          var warningKey = publicInstance + "." + callerName;
          didWarnStateUpdateForUnmountedComponent[warningKey] ||
            (console.error(
              "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
              callerName,
              publicInstance,
            ),
            (didWarnStateUpdateForUnmountedComponent[warningKey] = true));
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        function ComponentDummy() {}
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        function noop() {}
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          try {
            testStringCoercion(value);
            var JSCompiler_inline_result = false;
          } catch (e) {
            JSCompiler_inline_result = true;
          }
          if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 =
              ("function" === typeof Symbol &&
                Symbol.toStringTag &&
                value[Symbol.toStringTag]) ||
              value.constructor.name ||
              "Object";
            JSCompiler_temp_const.call(
              JSCompiler_inline_result,
              "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
              JSCompiler_inline_result$jscomp$0,
            );
            return testStringCoercion(value);
          }
        }
        function getComponentNameFromType(type) {
          if (null == type) return null;
          if ("function" === typeof type)
            return type.$$typeof === REACT_CLIENT_REFERENCE
              ? null
              : type.displayName || type.name || null;
          if ("string" === typeof type) return type;
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
              return "Activity";
          }
          if ("object" === typeof type)
            switch (
              ("number" === typeof type.tag &&
                console.error(
                  "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.",
                ),
              type.$$typeof)
            ) {
              case REACT_PORTAL_TYPE:
                return "Portal";
              case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
              case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
              case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type ||
                  ((type = innerType.displayName || innerType.name || ""),
                  (type =
                    "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef"));
                return type;
              case REACT_MEMO_TYPE:
                return (
                  (innerType = type.displayName || null),
                  null !== innerType
                    ? innerType
                    : getComponentNameFromType(type.type) || "Memo"
                );
              case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                  return getComponentNameFromType(type(innerType));
                } catch (x) {}
            }
          return null;
        }
        function getTaskName(type) {
          if (type === REACT_FRAGMENT_TYPE) return "<>";
          if (
            "object" === typeof type &&
            null !== type &&
            type.$$typeof === REACT_LAZY_TYPE
          )
            return "<...>";
          try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
          } catch (x) {
            return "<...>";
          }
        }
        function getOwner() {
          var dispatcher = ReactSharedInternals.A;
          return null === dispatcher ? null : dispatcher.getOwner();
        }
        function UnknownOwner() {
          return Error("react-stack-top-frame");
        }
        function hasValidKey(config) {
          if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return false;
          }
          return void 0 !== config.key;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          function warnAboutAccessingKey() {
            specialPropKeyWarningShown ||
              ((specialPropKeyWarningShown = true),
              console.error(
                "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
                displayName,
              ));
          }
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true,
          });
        }
        function elementRefGetterWithDeprecationWarning() {
          var componentName = getComponentNameFromType(this.type);
          didWarnAboutElementRef[componentName] ||
            ((didWarnAboutElementRef[componentName] = true),
            console.error(
              "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.",
            ));
          componentName = this.props.ref;
          return void 0 !== componentName ? componentName : null;
        }
        function ReactElement(type, key, props, owner, debugStack, debugTask) {
          var refProp = props.ref;
          type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type,
            key,
            props,
            _owner: owner,
          };
          null !== (void 0 !== refProp ? refProp : null)
            ? Object.defineProperty(type, "ref", {
                enumerable: false,
                get: elementRefGetterWithDeprecationWarning,
              })
            : Object.defineProperty(type, "ref", {
                enumerable: false,
                value: null,
              });
          type._store = {};
          Object.defineProperty(type._store, "validated", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: 0,
          });
          Object.defineProperty(type, "_debugInfo", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: null,
          });
          Object.defineProperty(type, "_debugStack", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: debugStack,
          });
          Object.defineProperty(type, "_debugTask", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: debugTask,
          });
          Object.freeze && (Object.freeze(type.props), Object.freeze(type));
          return type;
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          newKey = ReactElement(
            oldElement.type,
            newKey,
            oldElement.props,
            oldElement._owner,
            oldElement._debugStack,
            oldElement._debugTask,
          );
          oldElement._store &&
            (newKey._store.validated = oldElement._store.validated);
          return newKey;
        }
        function validateChildKeys(node) {
          isValidElement(node)
            ? node._store && (node._store.validated = 1)
            : "object" === typeof node &&
              null !== node &&
              node.$$typeof === REACT_LAZY_TYPE &&
              ("fulfilled" === node._payload.status
                ? isValidElement(node._payload.value) &&
                  node._payload.value._store &&
                  (node._payload.value._store.validated = 1)
                : node._store && (node._store.validated = 1));
        }
        function isValidElement(object) {
          return (
            "object" === typeof object &&
            null !== object &&
            object.$$typeof === REACT_ELEMENT_TYPE
          );
        }
        function escape(key) {
          var escaperLookup = { "=": "=0", ":": "=2" };
          return (
            "$" +
            key.replace(/[=:]/g, function (match) {
              return escaperLookup[match];
            })
          );
        }
        function getElementKey(element, index) {
          return "object" === typeof element &&
            null !== element &&
            null != element.key
            ? (checkKeyStringCoercion(element.key), escape("" + element.key))
            : index.toString(36);
        }
        function resolveThenable(thenable) {
          switch (thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
            default:
              switch (
                ("string" === typeof thenable.status
                  ? thenable.then(noop, noop)
                  : ((thenable.status = "pending"),
                    thenable.then(
                      function (fulfilledValue) {
                        "pending" === thenable.status &&
                          ((thenable.status = "fulfilled"),
                          (thenable.value = fulfilledValue));
                      },
                      function (error) {
                        "pending" === thenable.status &&
                          ((thenable.status = "rejected"),
                          (thenable.reason = error));
                      },
                    )),
                thenable.status)
              ) {
                case "fulfilled":
                  return thenable.value;
                case "rejected":
                  throw thenable.reason;
              }
          }
          throw thenable;
        }
        function mapIntoArray(
          children,
          array,
          escapedPrefix,
          nameSoFar,
          callback,
        ) {
          var type = typeof children;
          if ("undefined" === type || "boolean" === type) children = null;
          var invokeCallback = false;
          if (null === children) invokeCallback = true;
          else
            switch (type) {
              case "bigint":
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                    break;
                  case REACT_LAZY_TYPE:
                    return (
                      (invokeCallback = children._init),
                      mapIntoArray(
                        invokeCallback(children._payload),
                        array,
                        escapedPrefix,
                        nameSoFar,
                        callback,
                      )
                    );
                }
            }
          if (invokeCallback) {
            invokeCallback = children;
            callback = callback(invokeCallback);
            var childKey =
              "" === nameSoFar
                ? "." + getElementKey(invokeCallback, 0)
                : nameSoFar;
            isArrayImpl(callback)
              ? ((escapedPrefix = ""),
                null != childKey &&
                  (escapedPrefix =
                    childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"),
                mapIntoArray(callback, array, escapedPrefix, "", function (c) {
                  return c;
                }))
              : null != callback &&
                (isValidElement(callback) &&
                  (null != callback.key &&
                    ((invokeCallback && invokeCallback.key === callback.key) ||
                      checkKeyStringCoercion(callback.key)),
                  (escapedPrefix = cloneAndReplaceKey(
                    callback,
                    escapedPrefix +
                      (null == callback.key ||
                      (invokeCallback && invokeCallback.key === callback.key)
                        ? ""
                        : ("" + callback.key).replace(
                            userProvidedKeyEscapeRegex,
                            "$&/",
                          ) + "/") +
                      childKey,
                  )),
                  "" !== nameSoFar &&
                    null != invokeCallback &&
                    isValidElement(invokeCallback) &&
                    null == invokeCallback.key &&
                    invokeCallback._store &&
                    !invokeCallback._store.validated &&
                    (escapedPrefix._store.validated = 2),
                  (callback = escapedPrefix)),
                array.push(callback));
            return 1;
          }
          invokeCallback = 0;
          childKey = "" === nameSoFar ? "." : nameSoFar + ":";
          if (isArrayImpl(children))
            for (var i = 0; i < children.length; i++)
              ((nameSoFar = children[i]),
                (type = childKey + getElementKey(nameSoFar, i)),
                (invokeCallback += mapIntoArray(
                  nameSoFar,
                  array,
                  escapedPrefix,
                  type,
                  callback,
                )));
          else if (((i = getIteratorFn(children)), "function" === typeof i))
            for (
              i === children.entries &&
                (didWarnAboutMaps ||
                  console.warn(
                    "Using Maps as children is not supported. Use an array of keyed ReactElements instead.",
                  ),
                (didWarnAboutMaps = true)),
                children = i.call(children),
                i = 0;
              !(nameSoFar = children.next()).done;
            )
              ((nameSoFar = nameSoFar.value),
                (type = childKey + getElementKey(nameSoFar, i++)),
                (invokeCallback += mapIntoArray(
                  nameSoFar,
                  array,
                  escapedPrefix,
                  type,
                  callback,
                )));
          else if ("object" === type) {
            if ("function" === typeof children.then)
              return mapIntoArray(
                resolveThenable(children),
                array,
                escapedPrefix,
                nameSoFar,
                callback,
              );
            array = String(children);
            throw Error(
              "Objects are not valid as a React child (found: " +
                ("[object Object]" === array
                  ? "object with keys {" +
                    Object.keys(children).join(", ") +
                    "}"
                  : array) +
                "). If you meant to render a collection of children, use an array instead.",
            );
          }
          return invokeCallback;
        }
        function mapChildren(children, func, context) {
          if (null == children) return children;
          var result = [],
            count = 0;
          mapIntoArray(children, result, "", "", function (child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function lazyInitializer(payload) {
          if (-1 === payload._status) {
            var ioInfo = payload._ioInfo;
            null != ioInfo && (ioInfo.start = ioInfo.end = performance.now());
            ioInfo = payload._result;
            var thenable = ioInfo();
            thenable.then(
              function (moduleObject) {
                if (0 === payload._status || -1 === payload._status) {
                  payload._status = 1;
                  payload._result = moduleObject;
                  var _ioInfo = payload._ioInfo;
                  null != _ioInfo && (_ioInfo.end = performance.now());
                  void 0 === thenable.status &&
                    ((thenable.status = "fulfilled"),
                    (thenable.value = moduleObject));
                }
              },
              function (error) {
                if (0 === payload._status || -1 === payload._status) {
                  payload._status = 2;
                  payload._result = error;
                  var _ioInfo2 = payload._ioInfo;
                  null != _ioInfo2 && (_ioInfo2.end = performance.now());
                  void 0 === thenable.status &&
                    ((thenable.status = "rejected"), (thenable.reason = error));
                }
              },
            );
            ioInfo = payload._ioInfo;
            if (null != ioInfo) {
              ioInfo.value = thenable;
              var displayName = thenable.displayName;
              "string" === typeof displayName && (ioInfo.name = displayName);
            }
            -1 === payload._status &&
              ((payload._status = 0), (payload._result = thenable));
          }
          if (1 === payload._status)
            return (
              (ioInfo = payload._result),
              void 0 === ioInfo &&
                console.error(
                  "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
                  ioInfo,
                ),
              "default" in ioInfo ||
                console.error(
                  "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
                  ioInfo,
                ),
              ioInfo.default
            );
          throw payload._result;
        }
        function resolveDispatcher() {
          var dispatcher = ReactSharedInternals.H;
          null === dispatcher &&
            console.error(
              "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.",
            );
          return dispatcher;
        }
        function releaseAsyncTransition() {
          ReactSharedInternals.asyncTransitions--;
        }
        function enqueueTask(task) {
          if (null === enqueueTaskImpl)
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              enqueueTaskImpl = (module2 && module2[requireString]).call(
                module2,
                "timers",
              ).setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function (callback) {
                false === didWarnAboutMessageChannel &&
                  ((didWarnAboutMessageChannel = true),
                  "undefined" === typeof MessageChannel &&
                    console.error(
                      "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.",
                    ));
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          return enqueueTaskImpl(task);
        }
        function aggregateErrors(errors) {
          return 1 < errors.length && "function" === typeof AggregateError
            ? new AggregateError(errors)
            : errors[0];
        }
        function popActScope(prevActQueue, prevActScopeDepth) {
          prevActScopeDepth !== actScopeDepth - 1 &&
            console.error(
              "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ",
            );
          actScopeDepth = prevActScopeDepth;
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          var queue = ReactSharedInternals.actQueue;
          if (null !== queue)
            if (0 !== queue.length)
              try {
                flushActQueue(queue);
                enqueueTask(function () {
                  return recursivelyFlushAsyncActWork(
                    returnValue,
                    resolve,
                    reject,
                  );
                });
                return;
              } catch (error) {
                ReactSharedInternals.thrownErrors.push(error);
              }
            else ReactSharedInternals.actQueue = null;
          0 < ReactSharedInternals.thrownErrors.length
            ? ((queue = aggregateErrors(ReactSharedInternals.thrownErrors)),
              (ReactSharedInternals.thrownErrors.length = 0),
              reject(queue))
            : resolve(returnValue);
        }
        function flushActQueue(queue) {
          if (!isFlushing) {
            isFlushing = true;
            var i = 0;
            try {
              for (; i < queue.length; i++) {
                var callback = queue[i];
                do {
                  ReactSharedInternals.didUsePromise = false;
                  var continuation = callback(false);
                  if (null !== continuation) {
                    if (ReactSharedInternals.didUsePromise) {
                      queue[i] = callback;
                      queue.splice(0, i);
                      return;
                    }
                    callback = continuation;
                  } else break;
                } while (1);
              }
              queue.length = 0;
            } catch (error) {
              (queue.splice(0, i + 1),
                ReactSharedInternals.thrownErrors.push(error));
            } finally {
              isFlushing = false;
            }
          }
        }
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
          "function" ===
            typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart &&
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
        var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for(
            "react.transitional.element",
          ),
          REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal"),
          REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment"),
          REACT_STRICT_MODE_TYPE =
            /* @__PURE__ */ Symbol.for("react.strict_mode"),
          REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler"),
          REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer"),
          REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context"),
          REACT_FORWARD_REF_TYPE =
            /* @__PURE__ */ Symbol.for("react.forward_ref"),
          REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense"),
          REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for(
            "react.suspense_list",
          ),
          REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo"),
          REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy"),
          REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity"),
          MAYBE_ITERATOR_SYMBOL = Symbol.iterator,
          didWarnStateUpdateForUnmountedComponent = {},
          ReactNoopUpdateQueue = {
            isMounted: function () {
              return false;
            },
            enqueueForceUpdate: function (publicInstance) {
              warnNoop(publicInstance, "forceUpdate");
            },
            enqueueReplaceState: function (publicInstance) {
              warnNoop(publicInstance, "replaceState");
            },
            enqueueSetState: function (publicInstance) {
              warnNoop(publicInstance, "setState");
            },
          },
          assign = Object.assign,
          emptyObject = {};
        Object.freeze(emptyObject);
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function (partialState, callback) {
          if (
            "object" !== typeof partialState &&
            "function" !== typeof partialState &&
            null != partialState
          )
            throw Error(
              "takes an object of state variables to update or a function which returns an object of state variables.",
            );
          this.updater.enqueueSetState(
            this,
            partialState,
            callback,
            "setState",
          );
        };
        Component.prototype.forceUpdate = function (callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        var deprecatedAPIs = {
          isMounted: [
            "isMounted",
            "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks.",
          ],
          replaceState: [
            "replaceState",
            "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236).",
          ],
        };
        for (fnName in deprecatedAPIs)
          deprecatedAPIs.hasOwnProperty(fnName) &&
            defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
        ComponentDummy.prototype = Component.prototype;
        deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
        deprecatedAPIs.constructor = PureComponent;
        assign(deprecatedAPIs, Component.prototype);
        deprecatedAPIs.isPureReactComponent = true;
        var isArrayImpl = Array.isArray,
          REACT_CLIENT_REFERENCE = /* @__PURE__ */ Symbol.for(
            "react.client.reference",
          ),
          ReactSharedInternals = {
            H: null,
            A: null,
            T: null,
            S: null,
            actQueue: null,
            asyncTransitions: 0,
            isBatchingLegacy: false,
            didScheduleLegacyUpdate: false,
            didUsePromise: false,
            thrownErrors: [],
            getCurrentStack: null,
            recentlyCreatedOwnerStacks: 0,
          },
          hasOwnProperty = Object.prototype.hasOwnProperty,
          createTask = console.createTask
            ? console.createTask
            : function () {
                return null;
              };
        deprecatedAPIs = {
          react_stack_bottom_frame: function (callStackForError) {
            return callStackForError();
          },
        };
        var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
        var didWarnAboutElementRef = {};
        var unknownOwnerDebugStack =
          deprecatedAPIs.react_stack_bottom_frame.bind(
            deprecatedAPIs,
            UnknownOwner,
          )();
        var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
        var didWarnAboutMaps = false,
          userProvidedKeyEscapeRegex = /\/+/g,
          reportGlobalError =
            "function" === typeof reportError
              ? reportError
              : function (error) {
                  if (
                    "object" === typeof window &&
                    "function" === typeof window.ErrorEvent
                  ) {
                    var event = new window.ErrorEvent("error", {
                      bubbles: true,
                      cancelable: true,
                      message:
                        "object" === typeof error &&
                        null !== error &&
                        "string" === typeof error.message
                          ? String(error.message)
                          : String(error),
                      error,
                    });
                    if (!window.dispatchEvent(event)) return;
                  } else if (
                    "object" === typeof process &&
                    "function" === typeof process.emit
                  ) {
                    process.emit("uncaughtException", error);
                    return;
                  }
                  console.error(error);
                },
          didWarnAboutMessageChannel = false,
          enqueueTaskImpl = null,
          actScopeDepth = 0,
          didWarnNoAwaitAct = false,
          isFlushing = false,
          queueSeveralMicrotasks =
            "function" === typeof queueMicrotask
              ? function (callback) {
                  queueMicrotask(function () {
                    return queueMicrotask(callback);
                  });
                }
              : enqueueTask;
        deprecatedAPIs = Object.freeze({
          __proto__: null,
          c: function (size) {
            return resolveDispatcher().useMemoCache(size);
          },
        });
        var fnName = {
          map: mapChildren,
          forEach: function (children, forEachFunc, forEachContext) {
            mapChildren(
              children,
              function () {
                forEachFunc.apply(this, arguments);
              },
              forEachContext,
            );
          },
          count: function (children) {
            var n = 0;
            mapChildren(children, function () {
              n++;
            });
            return n;
          },
          toArray: function (children) {
            return (
              mapChildren(children, function (child) {
                return child;
              }) || []
            );
          },
          only: function (children) {
            if (!isValidElement(children))
              throw Error(
                "React.Children.only expected to receive a single React element child.",
              );
            return children;
          },
        };
        exports2.Activity = REACT_ACTIVITY_TYPE;
        exports2.Children = fnName;
        exports2.Component = Component;
        exports2.Fragment = REACT_FRAGMENT_TYPE;
        exports2.Profiler = REACT_PROFILER_TYPE;
        exports2.PureComponent = PureComponent;
        exports2.StrictMode = REACT_STRICT_MODE_TYPE;
        exports2.Suspense = REACT_SUSPENSE_TYPE;
        exports2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE =
          ReactSharedInternals;
        exports2.__COMPILER_RUNTIME = deprecatedAPIs;
        exports2.act = function (callback) {
          var prevActQueue = ReactSharedInternals.actQueue,
            prevActScopeDepth = actScopeDepth;
          actScopeDepth++;
          var queue = (ReactSharedInternals.actQueue =
              null !== prevActQueue ? prevActQueue : []),
            didAwaitActCall = false;
          try {
            var result = callback();
          } catch (error) {
            ReactSharedInternals.thrownErrors.push(error);
          }
          if (0 < ReactSharedInternals.thrownErrors.length)
            throw (
              popActScope(prevActQueue, prevActScopeDepth),
              (callback = aggregateErrors(ReactSharedInternals.thrownErrors)),
              (ReactSharedInternals.thrownErrors.length = 0),
              callback
            );
          if (
            null !== result &&
            "object" === typeof result &&
            "function" === typeof result.then
          ) {
            var thenable = result;
            queueSeveralMicrotasks(function () {
              didAwaitActCall ||
                didWarnNoAwaitAct ||
                ((didWarnNoAwaitAct = true),
                console.error(
                  "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);",
                ));
            });
            return {
              then: function (resolve, reject) {
                didAwaitActCall = true;
                thenable.then(
                  function (returnValue) {
                    popActScope(prevActQueue, prevActScopeDepth);
                    if (0 === prevActScopeDepth) {
                      try {
                        (flushActQueue(queue),
                          enqueueTask(function () {
                            return recursivelyFlushAsyncActWork(
                              returnValue,
                              resolve,
                              reject,
                            );
                          }));
                      } catch (error$0) {
                        ReactSharedInternals.thrownErrors.push(error$0);
                      }
                      if (0 < ReactSharedInternals.thrownErrors.length) {
                        var _thrownError = aggregateErrors(
                          ReactSharedInternals.thrownErrors,
                        );
                        ReactSharedInternals.thrownErrors.length = 0;
                        reject(_thrownError);
                      }
                    } else resolve(returnValue);
                  },
                  function (error) {
                    popActScope(prevActQueue, prevActScopeDepth);
                    0 < ReactSharedInternals.thrownErrors.length
                      ? ((error = aggregateErrors(
                          ReactSharedInternals.thrownErrors,
                        )),
                        (ReactSharedInternals.thrownErrors.length = 0),
                        reject(error))
                      : reject(error);
                  },
                );
              },
            };
          }
          var returnValue$jscomp$0 = result;
          popActScope(prevActQueue, prevActScopeDepth);
          0 === prevActScopeDepth &&
            (flushActQueue(queue),
            0 !== queue.length &&
              queueSeveralMicrotasks(function () {
                didAwaitActCall ||
                  didWarnNoAwaitAct ||
                  ((didWarnNoAwaitAct = true),
                  console.error(
                    "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)",
                  ));
              }),
            (ReactSharedInternals.actQueue = null));
          if (0 < ReactSharedInternals.thrownErrors.length)
            throw (
              (callback = aggregateErrors(ReactSharedInternals.thrownErrors)),
              (ReactSharedInternals.thrownErrors.length = 0),
              callback
            );
          return {
            then: function (resolve, reject) {
              didAwaitActCall = true;
              0 === prevActScopeDepth
                ? ((ReactSharedInternals.actQueue = queue),
                  enqueueTask(function () {
                    return recursivelyFlushAsyncActWork(
                      returnValue$jscomp$0,
                      resolve,
                      reject,
                    );
                  }))
                : resolve(returnValue$jscomp$0);
            },
          };
        };
        exports2.cache = function (fn) {
          return function () {
            return fn.apply(null, arguments);
          };
        };
        exports2.cacheSignal = function () {
          return null;
        };
        exports2.captureOwnerStack = function () {
          var getCurrentStack = ReactSharedInternals.getCurrentStack;
          return null === getCurrentStack ? null : getCurrentStack();
        };
        exports2.cloneElement = function (element, config, children) {
          if (null === element || void 0 === element)
            throw Error(
              "The argument must be a React element, but you passed " +
                element +
                ".",
            );
          var props = assign({}, element.props),
            key = element.key,
            owner = element._owner;
          if (null != config) {
            var JSCompiler_inline_result;
            a: {
              if (
                hasOwnProperty.call(config, "ref") &&
                (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
                  config,
                  "ref",
                ).get) &&
                JSCompiler_inline_result.isReactWarning
              ) {
                JSCompiler_inline_result = false;
                break a;
              }
              JSCompiler_inline_result = void 0 !== config.ref;
            }
            JSCompiler_inline_result && (owner = getOwner());
            hasValidKey(config) &&
              (checkKeyStringCoercion(config.key), (key = "" + config.key));
            for (propName in config)
              !hasOwnProperty.call(config, propName) ||
                "key" === propName ||
                "__self" === propName ||
                "__source" === propName ||
                ("ref" === propName && void 0 === config.ref) ||
                (props[propName] = config[propName]);
          }
          var propName = arguments.length - 2;
          if (1 === propName) props.children = children;
          else if (1 < propName) {
            JSCompiler_inline_result = Array(propName);
            for (var i = 0; i < propName; i++)
              JSCompiler_inline_result[i] = arguments[i + 2];
            props.children = JSCompiler_inline_result;
          }
          props = ReactElement(
            element.type,
            key,
            props,
            owner,
            element._debugStack,
            element._debugTask,
          );
          for (key = 2; key < arguments.length; key++)
            validateChildKeys(arguments[key]);
          return props;
        };
        exports2.createContext = function (defaultValue) {
          defaultValue = {
            $$typeof: REACT_CONTEXT_TYPE,
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            _threadCount: 0,
            Provider: null,
            Consumer: null,
          };
          defaultValue.Provider = defaultValue;
          defaultValue.Consumer = {
            $$typeof: REACT_CONSUMER_TYPE,
            _context: defaultValue,
          };
          defaultValue._currentRenderer = null;
          defaultValue._currentRenderer2 = null;
          return defaultValue;
        };
        exports2.createElement = function (type, config, children) {
          for (var i = 2; i < arguments.length; i++)
            validateChildKeys(arguments[i]);
          i = {};
          var key = null;
          if (null != config)
            for (propName in (didWarnAboutOldJSXRuntime ||
              !("__self" in config) ||
              "key" in config ||
              ((didWarnAboutOldJSXRuntime = true),
              console.warn(
                "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform",
              )),
            hasValidKey(config) &&
              (checkKeyStringCoercion(config.key), (key = "" + config.key)),
            config))
              hasOwnProperty.call(config, propName) &&
                "key" !== propName &&
                "__self" !== propName &&
                "__source" !== propName &&
                (i[propName] = config[propName]);
          var childrenLength = arguments.length - 2;
          if (1 === childrenLength) i.children = children;
          else if (1 < childrenLength) {
            for (
              var childArray = Array(childrenLength), _i = 0;
              _i < childrenLength;
              _i++
            )
              childArray[_i] = arguments[_i + 2];
            Object.freeze && Object.freeze(childArray);
            i.children = childArray;
          }
          if (type && type.defaultProps)
            for (propName in ((childrenLength = type.defaultProps),
            childrenLength))
              void 0 === i[propName] &&
                (i[propName] = childrenLength[propName]);
          key &&
            defineKeyPropWarningGetter(
              i,
              "function" === typeof type
                ? type.displayName || type.name || "Unknown"
                : type,
            );
          var propName =
            1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
          return ReactElement(
            type,
            key,
            i,
            getOwner(),
            propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
            propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask,
          );
        };
        exports2.createRef = function () {
          var refObject = { current: null };
          Object.seal(refObject);
          return refObject;
        };
        exports2.forwardRef = function (render) {
          null != render && render.$$typeof === REACT_MEMO_TYPE
            ? console.error(
                "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).",
              )
            : "function" !== typeof render
              ? console.error(
                  "forwardRef requires a render function but was given %s.",
                  null === render ? "null" : typeof render,
                )
              : 0 !== render.length &&
                2 !== render.length &&
                console.error(
                  "forwardRef render functions accept exactly two parameters: props and ref. %s",
                  1 === render.length
                    ? "Did you forget to use the ref parameter?"
                    : "Any additional parameter will be undefined.",
                );
          null != render &&
            null != render.defaultProps &&
            console.error(
              "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?",
            );
          var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render },
            ownName;
          Object.defineProperty(elementType, "displayName", {
            enumerable: false,
            configurable: true,
            get: function () {
              return ownName;
            },
            set: function (name) {
              ownName = name;
              render.name ||
                render.displayName ||
                (Object.defineProperty(render, "name", { value: name }),
                (render.displayName = name));
            },
          });
          return elementType;
        };
        exports2.isValidElement = isValidElement;
        exports2.lazy = function (ctor) {
          ctor = { _status: -1, _result: ctor };
          var lazyType = {
              $$typeof: REACT_LAZY_TYPE,
              _payload: ctor,
              _init: lazyInitializer,
            },
            ioInfo = {
              name: "lazy",
              start: -1,
              end: -1,
              value: null,
              owner: null,
              debugStack: Error("react-stack-top-frame"),
              debugTask: console.createTask
                ? console.createTask("lazy()")
                : null,
            };
          ctor._ioInfo = ioInfo;
          lazyType._debugInfo = [{ awaited: ioInfo }];
          return lazyType;
        };
        exports2.memo = function (type, compare) {
          null == type &&
            console.error(
              "memo: The first argument must be a component. Instead received: %s",
              null === type ? "null" : typeof type,
            );
          compare = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: void 0 === compare ? null : compare,
          };
          var ownName;
          Object.defineProperty(compare, "displayName", {
            enumerable: false,
            configurable: true,
            get: function () {
              return ownName;
            },
            set: function (name) {
              ownName = name;
              type.name ||
                type.displayName ||
                (Object.defineProperty(type, "name", { value: name }),
                (type.displayName = name));
            },
          });
          return compare;
        };
        exports2.startTransition = function (scope) {
          var prevTransition = ReactSharedInternals.T,
            currentTransition = {};
          currentTransition._updatedFibers = /* @__PURE__ */ new Set();
          ReactSharedInternals.T = currentTransition;
          try {
            var returnValue = scope(),
              onStartTransitionFinish = ReactSharedInternals.S;
            null !== onStartTransitionFinish &&
              onStartTransitionFinish(currentTransition, returnValue);
            "object" === typeof returnValue &&
              null !== returnValue &&
              "function" === typeof returnValue.then &&
              (ReactSharedInternals.asyncTransitions++,
              returnValue.then(releaseAsyncTransition, releaseAsyncTransition),
              returnValue.then(noop, reportGlobalError));
          } catch (error) {
            reportGlobalError(error);
          } finally {
            (null === prevTransition &&
              currentTransition._updatedFibers &&
              ((scope = currentTransition._updatedFibers.size),
              currentTransition._updatedFibers.clear(),
              10 < scope &&
                console.warn(
                  "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.",
                )),
              null !== prevTransition &&
                null !== currentTransition.types &&
                (null !== prevTransition.types &&
                  prevTransition.types !== currentTransition.types &&
                  console.error(
                    "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React.",
                  ),
                (prevTransition.types = currentTransition.types)),
              (ReactSharedInternals.T = prevTransition));
          }
        };
        exports2.unstable_useCacheRefresh = function () {
          return resolveDispatcher().useCacheRefresh();
        };
        exports2.use = function (usable) {
          return resolveDispatcher().use(usable);
        };
        exports2.useActionState = function (action, initialState, permalink) {
          return resolveDispatcher().useActionState(
            action,
            initialState,
            permalink,
          );
        };
        exports2.useCallback = function (callback, deps) {
          return resolveDispatcher().useCallback(callback, deps);
        };
        exports2.useContext = function (Context) {
          var dispatcher = resolveDispatcher();
          Context.$$typeof === REACT_CONSUMER_TYPE &&
            console.error(
              "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?",
            );
          return dispatcher.useContext(Context);
        };
        exports2.useDebugValue = function (value, formatterFn) {
          return resolveDispatcher().useDebugValue(value, formatterFn);
        };
        exports2.useDeferredValue = function (value, initialValue) {
          return resolveDispatcher().useDeferredValue(value, initialValue);
        };
        exports2.useEffect = function (create, deps) {
          null == create &&
            console.warn(
              "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?",
            );
          return resolveDispatcher().useEffect(create, deps);
        };
        exports2.useEffectEvent = function (callback) {
          return resolveDispatcher().useEffectEvent(callback);
        };
        exports2.useId = function () {
          return resolveDispatcher().useId();
        };
        exports2.useImperativeHandle = function (ref, create, deps) {
          return resolveDispatcher().useImperativeHandle(ref, create, deps);
        };
        exports2.useInsertionEffect = function (create, deps) {
          null == create &&
            console.warn(
              "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?",
            );
          return resolveDispatcher().useInsertionEffect(create, deps);
        };
        exports2.useLayoutEffect = function (create, deps) {
          null == create &&
            console.warn(
              "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?",
            );
          return resolveDispatcher().useLayoutEffect(create, deps);
        };
        exports2.useMemo = function (create, deps) {
          return resolveDispatcher().useMemo(create, deps);
        };
        exports2.useOptimistic = function (passthrough, reducer) {
          return resolveDispatcher().useOptimistic(passthrough, reducer);
        };
        exports2.useReducer = function (reducer, initialArg, init) {
          return resolveDispatcher().useReducer(reducer, initialArg, init);
        };
        exports2.useRef = function (initialValue) {
          return resolveDispatcher().useRef(initialValue);
        };
        exports2.useState = function (initialState) {
          return resolveDispatcher().useState(initialState);
        };
        exports2.useSyncExternalStore = function (
          subscribe,
          getSnapshot,
          getServerSnapshot,
        ) {
          return resolveDispatcher().useSyncExternalStore(
            subscribe,
            getSnapshot,
            getServerSnapshot,
          );
        };
        exports2.useTransition = function () {
          return resolveDispatcher().useTransition();
        };
        exports2.version = "19.2.4";
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
          "function" ===
            typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop &&
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
      })();
  },
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports2, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_production();
    } else {
      module2.exports = require_react_development();
    }
  },
});

// lib/invoice-generator.tsx
var import_react = __toESM(require_react());
var import_renderer = require("@react-pdf/renderer");
var import_renderer2 = __toESM(require("@react-pdf/renderer"));
var CYAN_HEADER = "#87CED1";
var CYAN_DIVIDER = "#66BEC4";
var NAVY = "#1E4F96";
var BLACK = "#000000";
var WHITE = "#FFFFFF";
var GRAY_TEXT = "#444444";
var s = import_renderer.StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 9,
    color: BLACK,
    paddingTop: 38,
    paddingBottom: 50,
    paddingHorizontal: 54,
    backgroundColor: WHITE,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  companyBlock: {
    flexDirection: "column",
  },
  companyName: {
    fontWeight: "bold",
    fontSize: 10,
    marginBottom: 2,
  },
  companyLine: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  logoBox: {
    width: 132,
    height: 50,
    borderWidth: 0.5,
    borderColor: "#AAAAAA",
    flexDirection: "row",
    alignItems: "stretch",
    position: "relative",
  },
  logoBlueStripe: {
    width: 20,
    backgroundColor: NAVY,
  },
  logoSubtitle: {
    fontSize: 5,
    color: GRAY_TEXT,
    marginTop: 2,
    textAlign: "center",
  },
  invoiceTitle: {
    fontWeight: "bold",
    fontSize: 36,
    marginTop: 14,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  billMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  billBlock: {
    width: "30%",
  },
  billLabel: {
    fontWeight: "bold",
    fontSize: 9,
    marginBottom: 4,
  },
  billLine: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  metaTable: {
    flexDirection: "column",
    alignItems: "flex-end",
    width: "30%",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  metaLabel: {
    fontWeight: "bold",
    fontSize: 9,
    marginRight: 6,
    minWidth: 64,
    textAlign: "right",
  },
  metaValue: {
    fontSize: 9,
    minWidth: 60,
    textAlign: "right",
  },
  cyanDivider: {
    height: 1.5,
    backgroundColor: CYAN_DIVIDER,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: CYAN_HEADER,
    height: 18,
    alignItems: "center",
    marginBottom: 0,
  },
  thService: {
    fontWeight: "bold",
    fontSize: 9,
    width: "28%",
    paddingLeft: 2,
    alignSelf: "stretch",
    paddingTop: 4,
  },
  thActivity: {
    fontWeight: "bold",
    fontSize: 9,
    width: "30%",
    borderLeftWidth: 1.5,
    borderLeftColor: WHITE,
    borderLeftStyle: "solid",
    paddingLeft: 4,
    alignSelf: "stretch",
    paddingTop: 4,
  },
  thQty: {
    fontWeight: "bold",
    fontSize: 9,
    width: "14%",
    textAlign: "right",
    borderLeftWidth: 1.5,
    borderLeftColor: WHITE,
    borderLeftStyle: "solid",
    paddingRight: 4,
    paddingLeft: 4,
    alignSelf: "stretch",
    paddingTop: 4,
  },
  thRate: {
    fontWeight: "bold",
    fontSize: 9,
    width: "14%",
    textAlign: "right",
    borderLeftWidth: 1.5,
    borderLeftColor: WHITE,
    borderLeftStyle: "solid",
    paddingRight: 4,
    paddingLeft: 4,
    alignSelf: "stretch",
    paddingTop: 4,
  },
  thAmount: {
    fontWeight: "bold",
    fontSize: 9,
    width: "14%",
    textAlign: "right",
    borderLeftWidth: 1.5,
    borderLeftColor: WHITE,
    borderLeftStyle: "solid",
    paddingRight: 2,
    paddingLeft: 4,
    alignSelf: "stretch",
    paddingTop: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0,
  },
  tdService: {
    fontWeight: "bold",
    fontSize: 9,
    width: "28%",
    paddingLeft: 2,
    paddingTop: 1,
  },
  tdActivity: {
    width: "30%",
    paddingLeft: 4,
    lineHeight: 1.5,
  },
  tdQty: {
    fontSize: 9,
    width: "14%",
    textAlign: "right",
    paddingRight: 4,
  },
  tdRate: {
    fontSize: 9,
    width: "14%",
    textAlign: "right",
    paddingRight: 4,
  },
  tdAmount: {
    fontSize: 9,
    width: "14%",
    textAlign: "right",
    paddingRight: 2,
  },
  blackDivider: {
    height: 1,
    backgroundColor: BLACK,
    marginTop: 4,
  },
  blackDividerThin: {
    height: 0.4,
    backgroundColor: BLACK,
    marginTop: 2,
    marginBottom: 0,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  balanceLabel: {
    fontWeight: "bold",
    fontSize: 11,
  },
  balanceAmount: {
    fontWeight: "bold",
    fontSize: 22,
  },
  lowerSection: {
    flexDirection: "row",
    marginTop: 28,
    gap: 48,
  },
  addressBlock: {
    flex: 1,
  },
  sectionLabel: {
    fontWeight: "bold",
    fontSize: 9,
    marginBottom: 5,
  },
  addressLine: {
    fontSize: 9,
    lineHeight: 1.5,
  },
});
var firstNonEmpty = (...vals) => vals.find((v) => v && v.trim() !== "") || "";
var InvoiceDocument = ({ invoice }) => {
  const renderRows = invoice.lineItems.map((item) => {
    const activityLines = [];
    if (item.description) activityLines.push(...item.description.split("\n"));
    if (item.serviceDateRange) activityLines.push(item.serviceDateRange);
    return {
      service: item.title || "Services",
      activityLines,
      qty: item.quantity ? item.quantity.toString() : "",
      rate: item.rate !== null ? item.rate.toFixed(2) : "",
      amount: item.amount !== null ? item.amount.toFixed(2) : "",
    };
  });
  const balanceDueText = (invoice.balanceDue ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
  return /* @__PURE__ */ import_react.default.createElement(
    import_renderer.Document,
    { title: `Invoice #${invoice.invoiceNumber || ""}` },
    /* @__PURE__ */ import_react.default.createElement(
      import_renderer.Page,
      { size: "LETTER", style: s.page },
      /* @__PURE__ */ import_react.default.createElement(
        import_renderer.View,
        { style: s.headerRow },
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.companyBlock },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            { style: s.companyName },
            invoice.issuerName,
          ),
          invoice.issuerAddressLines.map((line, i) =>
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.Text,
              { key: i, style: s.companyLine },
              line,
            ),
          ),
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            { style: s.companyLine },
            invoice.issuerEmail,
          ),
        ),
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.logoBox },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.View,
            { style: s.logoBlueStripe },
          ),
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.View,
            {
              style: {
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
              },
            },
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.View,
              { style: { flexDirection: "row", alignItems: "flex-end" } },
              /* @__PURE__ */ import_react.default.createElement(
                import_renderer.Text,
                {
                  style: {
                    fontSize: 20,
                    fontWeight: "bold",
                    color: NAVY,
                    fontFamily: "Times-Roman",
                  },
                },
                "System",
              ),
              /* @__PURE__ */ import_react.default.createElement(
                import_renderer.Text,
                {
                  style: {
                    fontSize: 24,
                    fontWeight: "bold",
                    color: "#D32F2F",
                    marginLeft: 2,
                    fontFamily: "Times-Roman",
                  },
                },
                "4",
              ),
            ),
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.View,
              {
                style: {
                  height: 1,
                  width: 80,
                  backgroundColor: "#D32F2F",
                  marginTop: 2,
                },
              },
            ),
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.Text,
              { style: s.logoSubtitle },
              "Facility Services Management",
            ),
          ),
        ),
      ),
      /* @__PURE__ */ import_react.default.createElement(
        import_renderer.Text,
        { style: s.invoiceTitle },
        "INVOICE",
      ),
      /* @__PURE__ */ import_react.default.createElement(
        import_renderer.View,
        { style: s.billMetaRow },
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.billBlock },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            { style: s.billLabel },
            "BILL TO",
          ),
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            { style: s.billLine },
            invoice.billToName,
          ),
          invoice.billToAddressLines.map((line, i) =>
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.Text,
              { key: i, style: s.billLine },
              line,
            ),
          ),
        ),
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.metaTable },
          [
            ["CUSTOMER#", firstNonEmpty(invoice.customerNumber)],
            ["INVOICE#", firstNonEmpty(invoice.invoiceNumber)],
            ["DATE", firstNonEmpty(invoice.invoiceDate)],
            ["DUE DATE", firstNonEmpty(invoice.dueDate)],
          ].map(([label, value]) =>
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.View,
              { key: label, style: s.metaRow },
              /* @__PURE__ */ import_react.default.createElement(
                import_renderer.Text,
                { style: s.metaLabel },
                label,
              ),
              /* @__PURE__ */ import_react.default.createElement(
                import_renderer.Text,
                { style: s.metaValue },
                value,
              ),
            ),
          ),
        ),
      ),
      /* @__PURE__ */ import_react.default.createElement(import_renderer.View, {
        style: s.cyanDivider,
      }),
      /* @__PURE__ */ import_react.default.createElement(
        import_renderer.View,
        { style: s.tableHeader },
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.thService },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            null,
            "SERVICE",
          ),
        ),
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.thActivity },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            null,
            "ACTIVITY",
          ),
        ),
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.thQty },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            null,
            "QTY",
          ),
        ),
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.thRate },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            null,
            "RATE",
          ),
        ),
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.thAmount },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            null,
            "AMOUNT",
          ),
        ),
      ),
      renderRows.map((row, i) =>
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { key: i, style: s.tableRow },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.View,
            { style: s.tdService },
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.Text,
              null,
              row.service,
            ),
          ),
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.View,
            { style: s.tdActivity },
            row.activityLines.map((line, j) =>
              /* @__PURE__ */ import_react.default.createElement(
                import_renderer.Text,
                { key: j, style: { fontSize: 9, lineHeight: 1.55 } },
                line,
              ),
            ),
          ),
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.View,
            { style: s.tdQty },
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.Text,
              null,
              row.qty,
            ),
          ),
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.View,
            { style: s.tdRate },
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.Text,
              null,
              row.rate,
            ),
          ),
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.View,
            { style: s.tdAmount },
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.Text,
              null,
              row.amount,
            ),
          ),
        ),
      ),
      /* @__PURE__ */ import_react.default.createElement(import_renderer.View, {
        style: s.blackDivider,
      }),
      /* @__PURE__ */ import_react.default.createElement(import_renderer.View, {
        style: s.blackDividerThin,
      }),
      /* @__PURE__ */ import_react.default.createElement(
        import_renderer.View,
        { style: s.balanceRow },
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.Text,
          { style: s.balanceLabel },
          "BALANCE DUE",
        ),
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.Text,
          { style: s.balanceAmount },
          balanceDueText,
        ),
      ),
      /* @__PURE__ */ import_react.default.createElement(
        import_renderer.View,
        { style: s.lowerSection },
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.addressBlock },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            { style: s.sectionLabel },
            "SERVICE ADDRESS",
          ),
          invoice.serviceAddressLines.map((line, i) =>
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.Text,
              { key: i, style: s.addressLine },
              line,
            ),
          ),
        ),
        /* @__PURE__ */ import_react.default.createElement(
          import_renderer.View,
          { style: s.addressBlock },
          /* @__PURE__ */ import_react.default.createElement(
            import_renderer.Text,
            { style: s.sectionLabel },
            "REMIT TO",
          ),
          invoice.remitToLines.map((line, i) =>
            /* @__PURE__ */ import_react.default.createElement(
              import_renderer.Text,
              { key: i, style: s.addressLine },
              line,
            ),
          ),
        ),
      ),
    ),
  );
};
async function generateInvoicePDF(invoice) {
  const pdfStream = await import_renderer2.default.renderToStream(
    /* @__PURE__ */ import_react.default.createElement(InvoiceDocument, {
      invoice,
    }),
  );
  return new Promise((resolve, reject) => {
    const chunks = [];
    pdfStream.on("data", (chunk) => chunks.push(chunk));
    pdfStream.on("error", (err) => reject(err));
    pdfStream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// generate-test-pdf.ts
var import_fs = __toESM(require("fs"));
var sharedFields = {
  issuerName: "System4 S.N.E.",
  issuerEmail: "billing@system4ips.com",
  issuerAddressLines: [
    "60 Romano Vineyard Way, #101",
    "North Kingstown, RI 02852",
  ],
  remitToLines: [
    "System4 S.N.E.",
    "60 Romano Vineyard Way, #101",
    "North Kingstown, RI 02852",
    "Attn: billing@system4ips.com",
    "Phone: (401) 615-7043",
  ],
  poPlaceholderDetected: false,
  poOriginalText: null,
  sourceMetadata: {},
  extractedRawText: "",
  lowConfidence: false,
};
var invoice48572 = {
  ...sharedFields,
  invoiceNumber: "48572",
  customerNumber: "2758",
  invoiceDate: "03/10/2026",
  dueDate: "03/20/2026",
  balanceDue: 1224,
  totalAmount: 1224,
  subtotal: 1224,
  taxAmount: null,
  taxRate: null,
  creditAmount: null,
  billToName: "The Pennfield School",
  billToAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"],
  serviceAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"],
  lineItems: [
    {
      type: "service",
      title: "Porter Services: Inv #47057 in December was under charged $612.",
      description:
        "Inv #47771 in January was undercharged $612.\nTotal = $1224.00  03/10/2026",
      serviceDateRange: null,
      quantity: null,
      rate: null,
      amount: 1224,
    },
  ],
};
var invoice48166 = {
  ...sharedFields,
  invoiceNumber: "48166",
  customerNumber: "2758",
  invoiceDate: "03/01/2026",
  dueDate: "03/11/2026",
  balanceDue: 811.39,
  totalAmount: 811.39,
  subtotal: 3516,
  taxAmount: null,
  taxRate: null,
  creditAmount: 2704.61,
  billToName: "The Pennfield School",
  billToAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"],
  serviceAddressLines: ["110 Sandy Point Ave", "Portsmouth, RI 02871"],
  lineItems: [
    {
      type: "service",
      title: "Cleaning",
      description: "Cleaning",
      serviceDateRange: "03/01/2026 - 03/31/2026",
      quantity: null,
      rate: null,
      amount: 3516,
    },
    {
      type: "credit",
      title: "Credit",
      description: "Credit",
      serviceDateRange: null,
      quantity: null,
      rate: null,
      amount: 2704.61,
    },
  ],
};
var invoice48289 = {
  ...sharedFields,
  invoiceNumber: "48289",
  customerNumber: "2266",
  invoiceDate: "03/01/2026",
  dueDate: "03/11/2026",
  balanceDue: 956.09,
  totalAmount: 956.09,
  subtotal: 899,
  taxAmount: 57.09,
  taxRate: 6.35,
  creditAmount: null,
  billToName: "Ryder Truck- Waterbury",
  billToAddressLines: ["37 E Aurora St", "Waterbury, CT 06708"],
  serviceAddressLines: ["37 E Aurora St", "Waterbury, CT 06708"],
  lineItems: [
    {
      type: "service",
      title: "Cleaning",
      description: "PO# pending valid purchase order from Ryder.",
      serviceDateRange: "03/01/2026 - 03/31/2026",
      quantity: null,
      rate: null,
      amount: 899,
    },
    {
      type: "tax",
      title: "Sales Tax",
      description: "Waterbury, CT 06708 (6.35%)",
      serviceDateRange: null,
      quantity: null,
      rate: null,
      amount: 57.09,
    },
  ],
};
var invoiceLongText = {
  ...sharedFields,
  invoiceNumber: "LONG-TEXT",
  customerNumber: "9999",
  invoiceDate: "03/28/2026",
  dueDate: "04/01/2026",
  balanceDue: 9999.99,
  totalAmount: 9999.99,
  subtotal: 9999.99,
  taxAmount: null,
  taxRate: null,
  creditAmount: null,
  billToName:
    "Long Name Company Limited That Should Definitely Wrap Because It Is Too Long For A Single Line",
  billToAddressLines: [
    "123 Very Long Street Name That Might Also Need Wrapping If The Sidebar Is Small",
    "City of Longness, State of Wrap",
  ],
  serviceAddressLines: ["Service Point A", "Service Point B"],
  lineItems: [
    {
      type: "service",
      title:
        "Extremely Long Service Title That Should Warp To Multiple Lines Without Breaking The Layout",
      description:
        "This is a very long description intended to test the wrapping capabilities of the React-PDF generator. It contains many words and should wrap correctly within the 44% width allocated to the activity column without overflowing into the next column which contains quantity and rate information. We want to ensure that the flexbox engine correctly calculates heights and prevents horizontal spillover.",
      serviceDateRange: "01/01/2026 - 12/31/2026",
      quantity: 1e6,
      rate: 999.99,
      amount: 9999.99,
    },
  ],
};
async function run() {
  const tests = [
    { name: "test-48572-multiline.pdf", invoice: invoice48572 },
    { name: "test-48166-credit.pdf", invoice: invoice48166 },
    { name: "test-48289-tax.pdf", invoice: invoice48289 },
    { name: "test-overflow.pdf", invoice: invoiceLongText },
  ];
  for (const { name, invoice } of tests) {
    const pdfBytes = await generateInvoicePDF(invoice);
    import_fs.default.writeFileSync(name, pdfBytes);
    console.log(`\u2705 Generated ${name} (${pdfBytes.length} bytes)`);
  }
  console.log("\nDone. Compare generated PDFs against originals.");
}
run().catch(console.error);
/*! Bundled license information:

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
