var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                  ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
(function () {
  var __risuPlugin__ = {
    providers: [],
    fetchResponseQueue: [],
  };
  var sleep = function (ms) {
    return new Promise(function (r) {
      return setTimeout(r, ms);
    });
  };
  function transferDataAsync(type, body) {
    return __awaiter(this, void 0, void 0, function () {
      var id, i, q;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            id = "".concat(Date.now(), "_").concat(Math.random());
            postMessage({
              type: "fetch",
              body: __assign({ id: id }, body),
            });
            _a.label = 1;
          case 1:
            if (!true) return [3 /*break*/, 3];
            return [4 /*yield*/, sleep(50)];
          case 2:
            _a.sent();
            for (i = 0; i < __risuPlugin__.fetchResponseQueue.length; i++) {
              q = __risuPlugin__.fetchResponseQueue[i];
              if (q.id === id) {
                __risuPlugin__.fetchResponseQueue.splice(i, 1);
                return [2 /*return*/, q.data];
              }
            }
            return [3 /*break*/, 1];
          case 3:
            return [2 /*return*/];
        }
      });
    });
  }
  function risuFetch(url, arg) {
    return __awaiter(this, void 0, void 0, function () {
      var id, i, q;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            id = "".concat(Date.now(), "_").concat(Math.random());
            postMessage({
              type: "fetch",
              body: {
                id: id,
                url: url,
                arg: arg,
              },
            });
            _a.label = 1;
          case 1:
            if (!true) return [3 /*break*/, 3];
            return [4 /*yield*/, sleep(50)];
          case 2:
            _a.sent();
            for (i = 0; i < __risuPlugin__.fetchResponseQueue.length; i++) {
              q = __risuPlugin__.fetchResponseQueue[i];
              if (q.id === id) {
                __risuPlugin__.fetchResponseQueue.splice(i, 1);
                return [2 /*return*/, q.data];
              }
            }
            return [3 /*break*/, 1];
          case 3:
            return [2 /*return*/];
        }
      });
    });
  }
  function getArg(arg) {
    return __awaiter(this, void 0, void 0, function () {
      var id, i, q;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            id = "".concat(Date.now(), "_").concat(Math.random());
            postMessage({
              type: "getArg",
              body: {
                id: id,
                arg: arg,
              },
            });
            _a.label = 1;
          case 1:
            if (!true) return [3 /*break*/, 3];
            return [4 /*yield*/, sleep(50)];
          case 2:
            _a.sent();
            for (i = 0; i < __risuPlugin__.fetchResponseQueue.length; i++) {
              q = __risuPlugin__.fetchResponseQueue[i];
              if (q.id === id) {
                __risuPlugin__.fetchResponseQueue.splice(i, 1);
                return [2 /*return*/, q.data];
              }
            }
            return [3 /*break*/, 1];
          case 3:
            return [2 /*return*/];
        }
      });
    });
  }
  function addProvider(name, func) {
    postMessage({
      type: "addProvider",
      body: name,
    });
    __risuPlugin__.providers.push({
      name: name,
      func: func,
    });
  }
  function printLog(data) {
    postMessage({
      type: "log",
      body: data,
    });
  }
  function getChar() {
    return transferDataAsync("getChar", "");
  }
  function setChar(char) {
    postMessage({
      type: "setChar",
      body: char,
    });
  }
  function handleOnmessage(data) {
    return __awaiter(this, void 0, void 0, function () {
      var _a,
        body,
        providers,
        providerfunc,
        _i,
        providers_1,
        provider,
        _b,
        error_1;
      var _c;
      return __generator(this, function (_d) {
        switch (_d.label) {
          case 0:
            if (!data.type) {
              return [2 /*return*/];
            }
            _a = data.type;
            switch (_a) {
              case "requestProvider":
                return [3 /*break*/, 1];
              case "fetchData":
                return [3 /*break*/, 6];
            }
            return [3 /*break*/, 7];
          case 1:
            body = data.body;
            providers = __risuPlugin__.providers;
            providerfunc = null;
            for (
              _i = 0, providers_1 = providers;
              _i < providers_1.length;
              _i++
            ) {
              provider = providers_1[_i];
              if (provider.name === body.key) {
                providerfunc = provider.func;
              }
            }
            if (!!providerfunc) return [3 /*break*/, 2];
            postMessage({
              type: "resProvider",
              body: {
                success: false,
                content: "unknown provider",
              },
            });
            return [3 /*break*/, 5];
          case 2:
            _d.trys.push([2, 4, , 5]);
            _b = postMessage;
            _c = {
              type: "resProvider",
            };
            return [4 /*yield*/, providerfunc(body.arg)];
          case 3:
            _b.apply(void 0, [((_c.body = _d.sent()), _c)]);
            return [3 /*break*/, 5];
          case 4:
            error_1 = _d.sent();
            postMessage({
              type: "resProvider",
              body: {
                success: false,
                content: "providerError: ".concat(error_1),
              },
            });
            return [3 /*break*/, 5];
          case 5:
            return [3 /*break*/, 7];
          case 6:
            {
              __risuPlugin__.fetchResponseQueue.push(data.body);
              return [3 /*break*/, 7];
            }
            _d.label = 7;
          case 7:
            return [2 /*return*/];
        }
      });
    });
  }
  onmessage = function (ev) {
    handleOnmessage(ev.data);
    var data = ev.data;
  };
  {
    var __risuPlugin__1 = null;
    var transferDataAsync_1 = null;
    //{{placeholder}}
  }
})();
