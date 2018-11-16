# series-query

## 解决的问题
1. 参数保留，即保证连续请求，最初设置的初始参数不会变化，在翻页时比较有用
2. 时序保证，连续请求只保留最后一次数据，不会因为接口返回顺序不同导致数据显示不正确
3. 解决多次请求时 loading 在中途取消问题

下面是示例，其中未使用本库之前简单的表格翻页 BUG 如下
（其中第一页返回结果延迟1s, 第二页 2s，第三页 3s， 第四页 4s，代码可在示例网站中查看源代码）：

![](https://image.eff.red/series-query-async-error.gif)

使用本库之后的结果：

![](https://image.eff.red/series-query-async-right.gif)

## 使用方式

### 支持配置参数
- stale: 保证参数不变化，默认为 true
- onlyLatest: 只保留最新一次的返回，只要不是最后一次请求的结果全部丢弃，默认为 false
- func: 查询执行的函数, 必传
- varyKeys: 每次查询中可能会变化的键值，默认 ['page_size', 'page_num']
- onLoadingChange: loading 状态变化函数，只在没有查询时和启动查询时变化，接收参数为 boolean

### 可调用的方法
- `query(params) => Promise<any>` 发起连续查询
- `setQueryParams(params) => void` 设置需要固化的参数
- `getStaleParams() => void` 获取除可变参数外的参数
- `setGlobalOptions(options) => void` 设置全局的默认参数，必须在 new 实例之前执行

`SeriesOrderError` 是重复的错误对象，其请求值挂在 data 下，需要自行判断是否丢弃该值，可参见后续的示例

### stale 模式实例
即保证参数不变化
```javascript
// 创建实例，在请求之前创建实例
this.pageQuery = new SeriesQuery({
  func: apiFetch,
  onLoadingChange: (val) => {
    this.loading = val
  }
})

// 填入需要固定的查询参数 params
this.pageQuery.setQueryParams(this.filter)

// 查询分页的列表
getList () {
  const params = {
    page_size: this.page.page_size,
    page_num: this.page.page_num,
  }
  return this.pageQuery.query(params)
    .then((res) => {
      if (res instanceof Error && res.name === 'SeriesOrderError') {
        return
      }
      if (res.error_no !== 0) {
        alert('error')
        return
      }
      this.list.data = (res.data && res.data.list) || []
    })
}
// 获取除可变参数外的数据
this.pageQuery.getStaleParams()

```

### 非 stale 模式

此模式下无需设置 stale 内的参数，即保证每次查询参数都是最新的

```javascript
this.pageQuery = new SeriesQuery({
  func: apiFetch,
  onLoadingChange: (val) => {
    this.loading = val
  },
  stale: false
})

// 查询分页的列表
getList () {
  const params = {
    otherKey: 'value',
    page_size: this.page.page_size,
    page_num: this.page.page_num,
  }
  return this.pageQuery.query(params)
    .then((res) => {
      if (res instanceof Error && res.name === 'SeriesOrderError') {
        return
      }
      if (res.error_no !== 0) {
        alert('error')
        return
      }
      this.list.data = (res.data && res.data.list) || []
    })
}
```
