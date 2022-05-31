import Axios from 'axios';

const supportedMethods = ["GET","POST","PATCH","PUT","DELETE"];

const maxSubscriptions = 12;

export var sameRequestQueue = [];
export var subscriptionQueue = [];
export var subscriptions = {};
export const request = async (name, endpoint, method, data, callback, retryAttemptsOpt, timeoutOpt) => {
  let retryAttempts = (retryAttemptsOpt !== undefined) ? retryAttemptsOpt : 1;
  let timeout = (timeoutOpt !== undefined) ? timeoutOpt : 60000;

  if(Object.keys(subscriptions).length >= maxSubscriptions){
    subscriptionQueue.push({name,endpoint,method,data,callback,retryAttempts,timeout});
    return;
  }

  if(!supportedMethods.includes(method)){
    console.error("Ajax Request Error: Unrecognized Method: ",method);
    return false;
  }

  if(name in subscriptions){
    sameRequestQueue.push({
      name, 
      callback, 
    });
    return false;
  }

  const source = Axios.CancelToken.source();
  subscriptions[name] = {
    source: source,
  };

  const axiosData = {
    cancelToken: source.token,
    async: true,
    method: method,
    timeout: timeout,
    headers: {},
    url: endpoint,
  };

  const headers = {
    'Content-Type': 'application/json',
  };
  
  if(method !== "GET"){
    axiosData.data = data;
  } 

  axiosData.headers = headers;

  Axios(axiosData)
    .then(async function(response){
      if(response.data === undefined){
        console.log("Error, response data null but came back 200",response);
        callback.catch({code: 1, message:"Server Error: Then Response.data null"});
      }else{
        callback.then(response);
        callback.finally();
        for (let i = 0; i < subscriptionQueue.length; i++) {
          const sub = subscriptionQueue[i];
          if(sub.name === name){
            sub.callback.then(response);
            sub.callback.finally();
          }
        }
        for (let i = 0; i < sameRequestQueue.length; i++) {
          const sub = sameRequestQueue[i];
          if(sub.name === name){
            sub.callback.then(response);
            sub.callback.finally();
          }
        }
        await unSubRequest(name);
      }
    })
    .catch(async function(error){
      if(Axios.isCancel(error)){return false;}
      console.log("Request catch error on name("+name+") response: ",error);
      if(error.code === "ECONNABORTED"){// On Timeout error
        retryAttempts = retryAttempts - 1;
        if(retryAttempts >= 1){
          await unSubRequest(name);
          return await request(name, endpoint, method, data, callback, retryAttempts, timeoutOpt);
        }
      }
      
      let err = {code: 1, message: "Request Error: Refresh the page to try again. Contact us if this continues. "};
      if( error !== undefined && error.response !== undefined && 
          error.response.data !== undefined && error.response.data.err !== undefined){

        err = error.response.data.err;

      }

      callback.catch(err);
      callback.finally();
      await unSubRequest(name);
    }).finally(async function(){
      
    }
  );
}

const moveQueue = async () => {
  let subLength = Object.keys(subscriptions).length;
  let queueLength = subscriptionQueue.length;
  while(subLength < maxSubscriptions && queueLength >= 1){
    let sub = subscriptionQueue[0];
    request(sub.name, sub.endpoint, sub.method, sub.data, sub.callback, sub.retryAttemptsOpt, sub.timeoutOpt)

    subscriptionQueue.shift();
    queueLength = subscriptionQueue.length;
    subLength = Object.keys(subscriptions).length;
  }
}

export const unSubRequest = async (name) => {
  
  if(name === "all"){
    subscriptions = {};
    sameRequestQueue = [];
    subscriptionQueue = [];
    return;
  }

  if(name in subscriptions){
    if(subscriptions[name].source !== undefined){
      let source = subscriptions[name].source;
      await source.cancel();
    }
    delete subscriptions[name];
  }

  for (let i = 0; i < subscriptionQueue.length; i++) {
    const sub = subscriptionQueue[i];
    if(sub.name === name){
      subscriptionQueue.splice(i, 1);
      i = i - 1;
    }
  }

  for (let i = 0; i < sameRequestQueue.length; i++) {
    const sub = sameRequestQueue[i];
    if(sub.name === name){
      sameRequestQueue.splice(i, 1);
      i = i - 1;
    }
  }

  moveQueue();
}

