let delay = function (time) {
  time = time || 1000
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}
function genRandomList (row, col, str) {
  row = row || 10
  col = col || 4
  const list = []
  for (let i = 0; i < row; i++) {
    const data = []
    for (let j = 0; j < col; j++) {
      data.push(`${str}, ${i}-${j}, ${Math.floor(Math.random() * 10)}`)
    }
    list.push(data)
  }
  return list
}

let api = {
  getData (params) {
    let { page_num } = params
    params = JSON.parse(JSON.stringify(params))
    const time = page_num * 1000
    return delay(time)
      .then(() => {
        const list = genRandomList(10, 4, `页${page_num}`)
        console.log(params)
        return {
          list,
          time
        }
      })
  }
}