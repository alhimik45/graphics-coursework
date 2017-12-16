let MAX_RGB = 255
let NUM_SECTIONS = 6
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

let canvas = new fabric.StaticCanvas('cnv')

class Elem {
  constructor (count, i, colors) {
    this.i = i
    this.rect = new fabric.Rect({
      width: (canvas.width - 50) / count,
      height: (300 / count) * i + 10,
      left: 0,
      top: canvas.height - 110 - (300 / count) * i - 10,
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
  if (animationSpeed >= 1 / 20)
    path.opacity = 0
  canvas.add(path)
  if (animationSpeed >= 1 / 20)
    await move(path, 'opacity', 1, 300)
  return path
}

let hide = async elem => {
  if (animationSpeed >= 1 / 20)
    await move(elem, 'opacity', 0, 300)
  canvas.remove(elem)
}

let animationSpeed = 1

let move = (e, meth, to, dur) =>
  new Promise(resolve => {
    if (animationSpeed < 1 / 20) {
      requestAnimationFrame(() => {
        e[meth] = to
        resolve()
      })
      return
    }
    e.animate(meth, to, {
      duration: dur * animationSpeed,
      onChange: () => canvas.renderAll(),
      onComplete: resolve
    })
  })

let delayer = (i, j) => Math.abs(i - j) * 900 / arr.length + 300

let mover = async (arr, i, j) => {
  let e = arr[i]
  e.rect.bringToFront()
  await move(e.rect, 'left', j * e.rect.width, delayer(i, j))
  e.rect.sendToBack()
  arr[j] = arr[i]
}

let swap = async (arr, i, j) => {
  [arr[i], arr[j]] = [arr[j], arr[i]]
  let e1 = arr[i > j ? i : j]
  let e2 = arr[i > j ? j : i]
  e1.rect.bringToFront()
  e2.rect.bringToFront()
  let b = await quadBesier(
    e1.rect.left + e1.rect.width / 2,
    e2.rect.left + e2.rect.width / 2,
    canvas.height - 470)
  let aniSwap = async (e1, e2) => {
    if (animationSpeed >= 1 / 20)
      await move(e1.rect, 'top', e1.rect.top + 25, 300)
    await move(e1.rect, 'left', e2.rect.left, delayer(i, j))
    if (animationSpeed >= 1 / 20)
      await move(e1.rect, 'top', e1.rect.top - 25, 300)
  }
  await Promise.all([aniSwap(e1, e2), aniSwap(e2, e1)])
  e1.rect.sendToBack()
  e2.rect.sendToBack()
  await hide(b)
}

let tmp
let tmpI
let toTemp = async (arr, i) => {
  let e = arr[i]
  tmpI = i
  await move(e.rect, 'top', e.rect.top - 300, 500)
  tmp = e
}

let fromTemp = async (arr, i) => {
  tmp.rect.bringToFront()
  let ll = i * tmp.rect.width
  let b
  if (tmpI !== i)
    b = await quadBesier(
      ll + tmp.rect.width / 2,
      tmp.rect.left + tmp.rect.width / 2,
      canvas.height - 470)
  await move(tmp.rect, 'left', ll, delayer(tmpI, i))
  await move(tmp.rect, 'top', tmp.rect.top + 300, 500)
  tmp.rect.sendToBack()
  arr[i] = tmp
  b && await hide(b)
  tmp = null
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
  g.top = canvas.height - 110
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
let workHard

let sortInterpreter = async gen => {
  workHard = true
  document.querySelectorAll(".be").forEach(b => b.disabled = true)
  gen = gen(arr.length)
  let r = gen.next()
  while (!r.done && (workHard || tmp)) {
    let val = r.value
    switch (val.type) {
      case 'eye':
        await eye(arr, val.i, val.n)
        if (val.i >= 0)
          r = gen.next(arr[val.i] && arr[val.i].i)
        else
          r = gen.next()
        break
      case 'swap':
        await swap(arr, val.i, val.j)
        r = gen.next()
        break
      case 'move':
        await mover(arr, val.from, val.to)
        r = gen.next()
        break
      case 'stmp':
        await toTemp(arr, val.i)
        r = gen.next(tmp.i)
        break
      case 'ltmp':
        await fromTemp(arr, val.i)
        r = gen.next()
        break
    }
  }
  workHard = true
  Object.values(eyes).forEach(e => canvas.remove(e))
  eyes = {}
  canvas.renderAll()
  document.querySelectorAll(".be").forEach(b => b.disabled = false)
}

let createArr = () => {
  let size = document.querySelector("#arr").value
  if (size <= 0) {
    alert("Неверный размер!")
  }
  arr = genArr(+size)
}

let sorts = {
  "Пузырьковая сортировка": "bubbleSort",
  "Сортировка вставками": "insertionSort",
  "Сортировка выбором": "selectionSort",
  "Сортировка Шелла": "shellSort",
  "Сортировка слиянием": "mergeSort",
}

Object.entries(sorts).forEach(e => {
  let t = document.querySelector("#tab")
  t.innerHTML += `<tr><td><button class='be' onclick='sortInterpreter(${e[1]})'>${e[0]}</button></td></tr>`
})

let changeSpeed = sp => {
  animationSpeed = 1 / sp
}

let bubbleSort = function* (length) {
  let swapped
  do {
    swapped = false
    for (let i = 0; i < length - 1; i++) {
      let ai = yield { type: 'eye', i, n: 0 }
      let ai1 = yield { type: 'eye', i: i + 1, n: 1 }
      if (ai > ai1) {
        yield { type: 'swap', i: i, j: i + 1 }
        swapped = true
      }
    }
  } while (swapped)
}

let insertionSort = function* (len) {
  for (let i = 1; i < len; i++) {
    let tmp = yield { type: 'eye', i, n: 0 }
    tmp = yield { type: 'stmp', i }
    let uj = yield { type: 'eye', i: i - 1, n: 1 }
    for (var j = i - 1; j >= 0 && (uj > tmp);) {
      yield { type: 'move', from: j, to: j + 1 }
      --j
      if (j >= 0)
        uj = yield { type: 'eye', i: j, n: 1 }
    }
    yield { type: 'ltmp', i: j + 1 }
  }
}

let selectionSort = function* (len) {

  let min

  for (let i = 0; i < len; i++) {

    min = i
    for (let j = i + 1; j < len; j++) {
      let im = yield { type: 'eye', i: min, n: 0 }
      let ij = yield { type: 'eye', i: j, n: 1 }
      if (ij < im) {
        min = j
      }
    }

    if (i !== min) {
      yield { type: 'swap', i: i, j: min }
    }
  }
}

let shellSort = function* (len) {
  for (let h = len; h > 0; h = parseInt(h / 2)) {
    for (let i = h; i < len; i++) {
      let j
      let k = yield { type: 'eye', i: i, n: 0 }
      k = yield { type: 'stmp', i: i }
      let ajh = yield { type: 'eye', i: i - h, n: 1 }
      for (j = i; j >= h && k < ajh;) {
        yield { type: 'move', from: j - h, to: j }
        j -= h
        if (j >= h)
          ajh = yield { type: 'eye', i: j - h, n: 1 }
      }
      yield { type: 'ltmp', i: j }
    }
  }
}

let mergeSort = function* (len) {
  let floor = Math.floor

  function* lower (from, to, value) {
    while (to > from) {
      let middle = from + floor((to - from) / 2)
      let am = yield { type: 'eye', i: middle, n: 1 }
      if (am < value) {
        from = middle + 1
      } else {
        to = middle
      }
    }
    yield { type: 'eye', i: -1, n: 1 }
    return from
  }

  function* upper (from, to, value) {
    while (to > from) {
      let middle = from + floor((to - from) / 2)
      let am = yield { type: 'eye', i: middle, n: 1 }
      if (value < am) {
        to = middle
      } else {
        from = middle + 1
      }
    }
    yield { type: 'eye', i: -1, n: 1 }
    return from
  }

  function* reverse (from, to) {
    --from
    while (++from < --to) {
      yield { type: 'eye', i: from, n: 2 }
      yield { type: 'eye', i: to, n: 3 }
      yield { type: 'swap', i: from, j: to }
    }
    yield { type: 'eye', i: -1, n: 2 }
    yield { type: 'eye', i: -1, n: 3 }
  }

  function* rotate (from, pivot, to) {
    if (from < pivot && pivot < to) {
      yield* reverse(from, pivot)
      yield* reverse(pivot, to)
      yield* reverse(from, to)
    }
  }

  function* merge (from, pivot, to) {
    if (pivot == 10)
      debugger;
    let ap = yield { type: 'eye', i: pivot, n: 0 }
    let ap1 = yield { type: 'eye', i: pivot - 1, n: 0 }
    if (from < pivot && pivot < to && ap < ap1) {
      if (to - from === 2) {
        yield* reverse(from, to)
      } else {
        let firstCut = 0
        let secondCut = 0
        if (pivot - from > to - pivot) {
          firstCut = from + floor((pivot - from) / 2)
          let af = yield { type: 'eye', i: firstCut, n: 0 }
          secondCut = yield* lower(pivot, to, af)
        } else {
          secondCut = pivot + floor((to - pivot) / 2)
          let as = yield { type: 'eye', i: secondCut, n: 0 }
          firstCut = yield* upper(from, pivot, as)
        }
        yield* rotate(firstCut, pivot, secondCut)
        let middle = secondCut - pivot + firstCut
        yield* merge(middle, secondCut, to)
        yield* merge(from, firstCut, middle)
      }
    }
  }

  function* mergeSort (from, to) {
    if (to - from > 1) {
      let middle = from + floor((to - from) / 2)
      yield* mergeSort(from, middle)
      yield* mergeSort(middle, to)
      yield* merge(from, middle, to)
    }
  }

  yield *mergeSort(0, len)
}