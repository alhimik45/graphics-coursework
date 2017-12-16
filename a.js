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
    this.i = i
    this.rect = new fabric.Rect({
      width: (canvas.width - 50) / count,
      height: (300 / count) * i + 10,
      left: 0,
      top: canvas.height - 300 - (300 / count) * i - 10,
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
  eyes = {}
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

let quadBesier = async (x1, x2, y) => {
  let path = new fabric.Path(`C ${x1} ${y} ${(x1 + x2) / 2} ${y - 100} ${x2} ${y}`, {
    left: 0,
    top: 0,
    stroke: 'black',
    strokeWidth: 2,
    fill: false,
    selectable: false
  })
  path.opacity = 0
  canvas.add(path)
  await move(path, 'opacity', 1)
  return path
}

let hide = async elem => {
  await move(elem, 'opacity', 0)
  canvas.remove(elem)
}

let move = (e, meth, to, dur) =>
  new Promise(resolve => {
    e.animate(meth, to, {
      duration: dur,
      onChange: () => canvas.renderAll(),
      onComplete: resolve
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
  let b = await quadBesier(
    e1.rect.left + e1.rect.width / 2,
    e2.rect.left + e2.rect.width / 2,
    canvas.height - 610)
  let aniSwap = async (e1, e2) => {
    await move(e1.rect, 'top', e1.rect.top + 25, 300)
    await move(e1.rect, 'left', e2.rect.left, Math.abs(i - j) * 900 / arr.length + 300)
    await move(e1.rect, 'top', e1.rect.top - 25, 300)
  }
  await Promise.all([aniSwap(e1, e2), aniSwap(e2, e1)])
  e1.rect.sendToBack()
  e2.rect.sendToBack()
  await hide(b)
  animPending = false
}

let eyes = {}

let eyeImg = null

fabric.loadSVGFromURL('eye.svg', (objects, options) => {
  eyeImg = fabric.util.groupSVGElements(objects, options)
})

let getEye = n => {
  let e = fabric.util.object.clone(eyeImg)
  let path = new fabric.Path(`C 5 10 5 20 5 70`, {
    left: 0,
    top: -90,
    stroke: `rgb(${(n & 1) * 255},${(n & 2) * 255},${(n & 4) * 255})`,
    strokeWidth: 2,
    fill: false,
    selectable: false
  })
  let s = 20 / e.width
  e.scaleX = s
  e.scaleY = s
  let g = new fabric.Group([path, e])
  g.selectable = false
  g.top = canvas.height - 290
  g.newLeft = r => r.left + (r.width - e.width * s) / 2
  return g
}

let eye = async (arr, i, n) => {
  let e
  if (i < 0 || i >= arr.length) {
    if (eyes[n]) {
      e = eyes[n]
      delete eyes[n]
      canvas.remove(e)
      canvas.renderAll()
    }
    return
  }
  if (eyes[n]) {
    e = eyes[n]
  } else {
    e = eyes[n] = getEye(n)
    e.left = e.newLeft(arr[i].rect)
    canvas.add(e)
  }
  await
    move(e, 'left', e.newLeft(arr[i].rect), 500)
}

let arr = []

let sortInterpreter = async gen => {
  let r = gen.next()
  while (!r.done) {
    let val = r.value
    switch (val.type) {
      case 'eye':
        await eye(arr, val.i, val.n)
        r = gen.next(arr[val.i].i)
        break;
      case 'swap':
        await swap(arr, val.i, val.j)
        r = gen.next()
        break;
    }
  }
  Object.values(eyes).forEach(e => canvas.remove(e))
  canvas.renderAll()
}

arr = genArr(5)

let bubbleSort = function* (length) {
  let swapped
  do {
    swapped = false;
    for (let i = 0; i < length - 1; i++) {
      let ai = yield {type:'eye', i, n: 0}
      let ai1 = yield {type:'eye', i: i+1, n: 1}
      if (ai > ai1) {
        yield {type:'swap', i: i, j: i+1}
        swapped = true
      }
    }
  } while (swapped)
}