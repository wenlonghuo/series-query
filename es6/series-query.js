/**
 * @description 分页类请求发起，解决的问题：1. 参数保留，即保证翻页时请求参数不会变化，
 * 2. 时序保证，翻页时数据总是最后一次的页码，不会因为接口延时导致数据显示不正确
 * 3. 解决 loading 在中途取消问题
 */

const defaultOptions = {
  stale: true, // 保证参数不变化
  func: undefined, // 查询执行的函数, 必传
  varyKeys: ['page_size', 'page_num'], // 每次查询中可能会变化的键值
  onLoadingChange: undefined, // loading 状态变化函数，只在没有查询时和启动查询时变化，接收参数为 boolean
};

export class SeriesOrderError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'SeriesOrderError';
  }
}

class SeriesQuery {
  constructor(options = {}) {
    this.options = {
      ...defaultOptions,
      ...options,
    };
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
  query(params) {
    const queryOptions = this.options;
    const { func } = queryOptions;
    if (!func || typeof func !== 'function') {
      throw new TypeError('Please set Series-query query function');
    }

    let queryingParams = params;
    // 使用固化查询参数
    if (queryOptions.stale) {
      queryingParams = this.queryingParams || {};

      // 遍历每个 key，设置为最新
      // 实际上每次都会产生修改，便于继承上一次的默认值
      queryOptions.varyKeys.forEach((key) => {
        if (params[key] !== undefined) {
          queryingParams[key] = params[key];
        }
      });
    }

    // ID 自加1，控制顺序
    this.count = this.count + 1;
    const queryId = this.count;
    this.setLoading(queryId);
    return func(queryingParams)
      .then((res) => {
        this.setUnLoading(queryId);
        // 已经完成查询的 ID 大于当前 ID，需要返回丢弃信息
        if (queryId < this.lastId) {
          const error = new SeriesOrderError();
          error.data = res;
          return error;
        }
        // 设置最后一次查询的 ID
        this.lastId = queryId;
        return res;
      })
      .catch((e) => {
        this.setUnLoading(queryId);
        return Promise.reject(e);
      });
  }

  /**
   * 获取除可变参数外的查询参数对象
   */
  getStaleParams() {
    const params = {
      ...this.queryingParams,
    };
    this.options.varyKeys.forEach((key) => {
      params[key] = undefined;
    });
    return params;
  }

  /**
   * 固化需要查询的参数
   * @param {*} params 除 pageIndex pageSize 外的参数
   */
  setQueryParams(params) {
    this.queryingParams = JSON.parse(JSON.stringify(params));
  }

  setLoading(id) {
    this.loadingId = id;
    // 已在loading 中，不重复触发事件
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.noticeLoading();
  }

  setUnLoading(id) {
    // 非最近一次请求，不取消 loading 状态
    if (id < this.loadingId) {
      return;
    }
    this.loading = false;
    this.noticeLoading();
  }

  noticeLoading() {
    const onChange = this.options.onLoadingChange;
    if (onChange) {
      onChange(this.loading);
    }
  }
}

/**
   * 全局覆盖配置
   * @params Options
   */
export function setGlobalOptions(options = {}) {
  Object.assign(defaultOptions, options);
}

export default SeriesQuery;
