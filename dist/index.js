export * from './series-query';
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @description 分页类请求发起，解决的问题：1. 参数保留，即保证翻页时请求参数不会变化，
 * 2. 时序保证，翻页时数据总是最后一次的页码，不会因为接口延时导致数据显示不正确
 * 3. 解决 loading 在中途取消问题
 * @example
// 创建实例
created () {
  this.pageQuery = new SeriesQuery({
    func: apiFetch,
    onLoadingChange: (val) => {
      this.loading = val
    }
  })
}
// 设置固定的 params
search () {
  this.pageQuery.setQueryParams(this.filter)
}
// 查询分页的列表
getList () {
  const params = {
    page_size: this.page.page_size,
    page_num: this.page.page_num,
  }
  return this.pageQuery.query(params)
    .then((res) => {
      if (res.name === 'PageOrderError') {
        return
      }
      if (res.error_no !== 0) {
        alert('error')
        return
      }
      this.list.data = (res.data && res.data.list) || []
    })
}
// 使用除分页外的参数进行导出等操作
exportList () {
  const params = {
    query: this.pageQuery.getStaleParams()
  }
  return query(params)
}
 *
 */

var defaultOptions = {
  stale: true, // 保证参数不变化
  func: undefined, // 查询执行的函数, 必传
  varyKeys: ['page_size', 'page_num'], // 每次查询中可能会变化的键值
  onLoadingChange: undefined // loading 状态变化函数，只在没有查询时和启动查询时变化，接收参数为 boolean
};

export var SeriesOrderError = function (_Error) {
  _inherits(SeriesOrderError, _Error);

  function SeriesOrderError() {
    var _ref;

    _classCallCheck(this, SeriesOrderError);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var _this = _possibleConstructorReturn(this, (_ref = SeriesOrderError.__proto__ || Object.getPrototypeOf(SeriesOrderError)).call.apply(_ref, [this].concat(args)));

    _this.name = 'SeriesOrderError';
    return _this;
  }

  return SeriesOrderError;
}(Error);

var SeriesQuery = function () {
  function SeriesQuery() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, SeriesQuery);

    this.options = _extends({}, defaultOptions, options);
    this.count = -1; // 自动计数器
    this.lastId = -1; // 最后一次请求的 ID
    this.loadingId = -1; // loading 的 id, 之所以和 lastId 不共用，是因为lastId 是在请求成功后才赋值，loading 需要开始请求就赋值
    this.loading = false; // loading 状态
  }

  /**
   * 发起请求
   * @param {*} params 查询需要的参数
   * @param {*} options defaultOptions 其他参数
   * @return {Promise<any>} promise，可能返回 PageOrderError 错误
   */


  _createClass(SeriesQuery, [{
    key: 'query',
    value: function query(params) {
      var _this2 = this;

      var queryOptions = this.options;
      var func = queryOptions.func;

      if (!func || typeof func !== 'function') {
        throw new TypeError('Please set Series-query query function');
      }

      var queryingParams = params;
      // 使用固化查询参数
      if (queryOptions.stale) {
        queryingParams = this.queryingParams || {};

        // 遍历每个 key，设置为最新
        // 实际上每次都会产生修改，便于继承上一次的默认值
        queryOptions.varyKeys.forEach(function (key) {
          if (params[key] !== undefined) {
            queryingParams[key] = params[key];
          }
        });
      }

      // ID 自加1，控制顺序
      this.count = this.count + 1;
      var queryId = this.count;
      this.setLoading(queryId);
      return func(queryingParams).then(function (res) {
        _this2.setUnLoading(queryId);
        // 已经完成查询的 ID 大于当前 ID，需要返回丢弃信息
        if (queryId < _this2.lastId) {
          var error = new SeriesOrderError();
          error.data = res;
          return error;
        }
        // 设置最后一次查询的 ID
        _this2.lastId = queryId;
        return res;
      }).catch(function (e) {
        _this2.setUnLoading(queryId);
        return Promise.reject(e);
      });
    }

    /**
     * 获取除可变参数外的查询参数对象
     */

  }, {
    key: 'getStaleParams',
    value: function getStaleParams() {
      var params = _extends({}, this.queryingParams);
      this.options.varyKeys.forEach(function (key) {
        params[key] = undefined;
      });
      return params;
    }

    /**
     * 固化需要查询的参数
     * @param {*} params 除 pageIndex pageSize 外的参数
     */

  }, {
    key: 'setQueryParams',
    value: function setQueryParams(params) {
      this.queryingParams = JSON.parse(JSON.stringify(params));
    }
  }, {
    key: 'setLoading',
    value: function setLoading(id) {
      this.loadingId = id;
      // 已在loading 中，不重复触发事件
      if (this.loading) {
        return;
      }
      this.loading = true;
      this.noticeLoading();
    }
  }, {
    key: 'setUnLoading',
    value: function setUnLoading(id) {
      // 非最近一次请求，不取消 loading 状态
      if (id < this.loadingId) {
        return;
      }
      this.loading = false;
      this.noticeLoading();
    }
  }, {
    key: 'noticeLoading',
    value: function noticeLoading() {
      var onChange = this.options.onLoadingChange;
      if (onChange) {
        onChange(this.loading);
      }
    }
  }]);

  return SeriesQuery;
}();

/**
   * 全局覆盖配置
   * @params Options
   */


export function setGlobalOptions() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  Object.assign(defaultOptions, options);
}

export default SeriesQuery;