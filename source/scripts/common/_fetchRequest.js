/* 
# Оптимизация fetch запроса
*/
export function requestURL(url, method, body = null) {

  const options = {
    headers: {
      'Content-type': 'application/json'
    }
  }

  if (method !== 'GET') {
    options.method = method
  }

  if (method === 'POST' || method === 'PUT') {
    options.body = JSON.stringify(body)
  }

  return fetch(url, options)
    // .then( response => response.json())
}