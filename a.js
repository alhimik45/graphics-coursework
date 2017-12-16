let MAX_RGB = 255
let NUM_SECTIONS = 6
let animPending = false
let getRColor = index => {
  let section = Math.floor(index * NUM_SECTIONS)
  let start = (index - (section / NUM_SECTIONS)) * NUM_SECTIONS
  let end = 1 - start

  let colorArray
  switch (section) {
    case 0:
      colorArray = [1, start, 0]
      break
    case 1:
      colorArray = [end, 1, 0]
      break
    case 2:
      colorArray = [0, 1, start]
      break
    case 3:
      colorArray = [0, end, 1]
      break
    case 4:
      colorArray = [start, 0, 1]
      break
    case 5:
      colorArray = [1, 0, end]
      break
  }
  let col = colorArray.map(value => value * MAX_RGB)
  return `rgb(${col[0]},${col[1]},${col[2]})`
}

let getRColors = numberOfColors => {
  let rainbow = []
  _(numberOfColors).times(i => rainbow[i] = getRColor(i / numberOfColors))
  return rainbow
}

let canvas = new fabric.Canvas('cnv')

class Elem {
  constructor (count, i, colors) {
    this.rect = new fabric.Rect({
      width: (canvas.width - 50) / count,
      height: (300 / count) * i + 10,
      left: 0,
      top: canvas.height - 100 - (300 / count) * i - 10,
      selectable: false
    })

    this.rect.setGradient('fill', {
      type: 'linear',
      x1: -this.rect.width / 2,
      y1: 0,
      x2: this.rect.width / 2,
      y2: 0,
      colorStops: {
        0: colors[i],
        1: colors[i + 1]
      }
    })
  }
}

let genArr = count => {
  canvas.clear()
  let arr = []
  let colors = getRColors(count + 15)
  _(count).times(n => {
    let e = new Elem(count, n, colors)
    arr.push(e)
  })
  arr = _.shuffle(arr)
  arr.forEach((e, i) => {
    e.rect.left = i * e.rect.width
    canvas.add(e.rect)
  })
  return arr
}

let drawBesier = async (x1, x2, y) =>
  new Promise(resolve => {
    let path = new fabric.Path(`C ${x1} ${y} ${(x1 + x2) / 2} ${y + 100} ${x2} ${y}`, {
      left: 0,
      top: 0,
      stroke: 'black',
      strokeWidth: 2,
      fill: false,
      selectable: false
    })
    path.opacity = 0
    canvas.add(path)
    path.animate('opacity', '1', {
      duration: 300,
      onChange: () => canvas.renderAll(),
      onComplete: () => resolve(path)
    })
  })

let hide = async elem =>
  new Promise(resolve => {
    elem.animate('opacity', '0', {
      duration: 300,
      onChange: () => canvas.renderAll(),
      onComplete: () => {
        canvas.remove(elem)
        resolve()
      }
    })
  })

let swap = async (arr, i, j) => {
  if (animPending) return;
  animPending = true;
  [arr[i], arr[j]] = [arr[j], arr[i]]
  let e1 = arr[i > j ? i : j]
  let e2 = arr[i > j ? j : i]
  e1.rect.bringToFront()
  e2.rect.bringToFront()
  let b = await drawBesier(
    e1.rect.left + e1.rect.width / 2,
    e2.rect.left + e2.rect.width / 2,
    canvas.height - 90)
  let aniSwap = (e1, e2) =>
    new Promise((resolve) => {
      e1.rect.animate('top', e1.rect.top + 25, {
        duration: 300,
        onChange: () => canvas.renderAll(),
        onComplete: () => e1.rect.animate('left', e2.rect.left, {
          duration: Math.abs(i - j) * 900 / arr.length + 300,
          onChange: () => canvas.renderAll(),
          onComplete: () => e1.rect.animate('top', e1.rect.top - 25, {
            duration: 300,
            onChange: () => canvas.renderAll(),
            onComplete: () => resolve()
          })
        })
      })
    })

  await Promise.all([aniSwap(e1, e2), aniSwap(e2, e1)])
  e1.rect.sendToBack()
  e2.rect.sendToBack()
  await hide(b)
  animPending = false
}
arr = genArr(20)