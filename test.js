const request = require('request');

// const asyncFunc = () => {
//   return new Promise((resolve) => {
//     request('http://yahoo.co.jp',(err, response, body) => {
//       resolve(body)
//
//     });
//   })
// };
//
// // const result = asyncFunc();
// //
// // result.then((html) => {
// //   console.log("output", html)
// // });
//
// async function main () {
//   const html = await asyncFunc();
//   console.log('output', html)
// }
//
// main();

function asyncFunc(i) {
  return new Promise(function (resolve)
  {
    setTimeout(() =>{
      resolve(i)
    }, 1000)
  })
}

async function main () {
  for (let i=0; i<3; i++) {
    const result = await asyncFunc(i);
    console.log('output', result)
  }
}

main();

console.log('hoge');
