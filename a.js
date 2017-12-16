let MAX_RGB = 255
let NUM_SECTIONS = 6
let ELEM_HEIGHT = 200

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
  for (let i = 0; i < numberOfColors; ++i) {
    rainbow[i] = getRColor(i / numberOfColors)
  }
  return rainbow
}

let canvas = new fabric.Canvas('cnv')

// let rect = new fabric.Rect({
//   width: 50,
//   height: 200,
//   left: 100,
//   top: 100,
//   selectable: false
// })
//
// rect.setGradient('fill', {
//   type: 'linear',
//   x1: -rect.width / 2,
//   y1: 0,
//   x2: rect.width / 2,
//   y2: 0,
//   colorStops: {
//     0: '#ffe47b',
//     1: 'rgb(111,154,211)'
//   }
// })
//
// canvas.add(rect)
//
// let code = function () {
//   rect.animate('left', rect.left === 100 ? 400 : 100, {
//     duration: 1000,
//     onChange: canvas.renderAll.bind(canvas),
//     onComplete: function () {
//       setTimeout(code, 1000)
//     },
//     easing: fabric.util.ease["easeOutQuint"]
//   })
// }
// setTimeout(code, 1000)


class Elem {
  constructor (count, i, colors) {
    this.rect = new fabric.Rect({
      width: (canvas.width-50) / count,
      height: (300 / count)*i,
      left: 0,
      top: canvas.height - 100-(300 / count)*i,
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
        1: colors[i+1]
      }
    })
  }
}

let genArr = count => {
  canvas.clear()
  let arr = []
  let colors = getRColors(count+15)
  _(count).times(n => {
    let e = new Elem(count, n, colors)
    arr.push(e)
  })
  // arr = _.shuffle(arr)
  arr.forEach((e,i) => {
    e.rect.left = i*e.rect.width;
    canvas.add(e.rect);
  })
  return arr
}

let swap

