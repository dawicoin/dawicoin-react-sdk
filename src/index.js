// import React from 'react';
import React,{useEffect,useState} from 'react';
import './index.css';
import {request,unSubRequest} from './request';
import {clone} from './clone';

let EnvironmentEnum = {
  Production:"Production",
  Release:"Release",
  Local:"Local",
}

const DawicoinButton = ({env,sandbox,storeUid,priceUid,euid,callback}) => {
  env = (env && env in EnvironmentEnum)?env:EnvironmentEnum.Production
  sandbox = sandbox?true:false;
  storeUid = storeUid?storeUid:"";

  const [loading,setLoading] = useState(false);
  const [cashback,setCashback] = useState(2);
  const [acceptedCoins,setAcceptedCoins] = useState([]);
  const [show,setShow] = useState(false);
  const [newWindow,setNewWindow] = useState(null);
  const [error,setError] = useState(null);

  useEffect(() => {
    fetchStoreDetails({env,sandbox,storeUid})
    return () => {
      unSubRequest("dawicoin-fetch-store-details");
    }
  },[env,sandbox,storeUid]);

  const fetchStoreDetails = ({env,sandbox,storeUid}) => {
    let baseUrl = "";
    if(env && env === EnvironmentEnum.Local){
      baseUrl = "http://localhost:"+((sandbox)?"3046":"3045");
    }else if(env && env === EnvironmentEnum.Release){
      baseUrl = "https://api."+((sandbox)?"sandbox.":"")+"asurcoin.com";
    }else{
      baseUrl = "https://api."+((sandbox)?"sandbox.":"")+"dawicoin.com";
    }
    let endpoint = baseUrl + "/react-sdk/v1/"+storeUid;

    setLoading(true);
    setAcceptedCoins([]);
    setCashback(2);
    setError(null);
    request("dawicoin-fetch-store-details",endpoint,"GET", {}, {
      then: function(res){
        setAcceptedCoins(res.data.res.acceptedCoins);
        setCashback(res.data.res.cashbackPercentage*100);
      },
      catch: function(err){
        console.error(err.message);
        setError(err.message);
      },
      finally: function(){setLoading(false);}
    });
  }

  let coins = clone(acceptedCoins);
  coins.reverse();

  const openWindow = ({env,sandbox,priceUid,euid,}) => {
    let baseUrl = "";
    if(env && env === EnvironmentEnum.Local){
      baseUrl = "http://localhost:"+((sandbox)?"3041":"3040");
    }else if(env && env === EnvironmentEnum.Release){
      baseUrl = "https://"+((sandbox)?"sandbox.":"")+"asurcoin.com";
    }else{
      baseUrl = "https://"+((sandbox)?"sandbox.":"")+"dawicoin.com";
    }
    let redirect = window.document.URL;
    let url = baseUrl+"/p/"+priceUid+"?euid="+euid;
    url += "&r="+encodeURIComponent(redirect);

    let clientHeight = document.body.clientHeight;
    let clientWidth = document.body.clientWidth;
    let width = 440;
    let height = 640;
    let top = (clientHeight - height)/2 + window.screenY;
    let left = (clientWidth - width)/2 + window.screenX;
    let newWindow = window.open(url,'dawicoin','width='+width+',height='+height+',left='+left+',top='+top);
    setNewWindow(newWindow);
  }

  useEffect(() => {
    let timer = null;
    let leftDomain = false;
    if(newWindow){
      timer = setInterval(function() { 
        try {
          if (newWindow.document.domain === document.domain) {
            if (leftDomain && newWindow.document.readyState === "complete") {
              clearInterval(timer); timer = null;
              let url = newWindow.document.URL;
              url = url.replace(/.+\?/g,"");
              let data = {completed: true};
              let split = url.split("&");
              for (let i = 0; i < split.length; i++) {
                const item = split[i];
                const key = item.split("=")[0];
                const value = item.split("=")[1];
                data[key] = value;
              }
  
              if(callback && typeof callback === 'function'){
                callback(data);
              }
  
              newWindow.postMessage({ message: "requestResult" }, "*");
              newWindow.close();
              setShow(false);
            }
          }else {
            leftDomain = true;
          }
        }catch(e) {
          if (newWindow.closed) {
            clearInterval(timer);timer = null;
            setShow(false);
            return; 
          }
          leftDomain = true;
        }
        if(newWindow.closed) {
          clearInterval(timer);timer = null;
          setShow(false);
        }
      }, 200);
    }
    return () => {
      if(timer !== null){
        clearInterval(timer);timer = null;
      }
    }
  },[newWindow,callback]);


  let baseUrl = "";
  if(env && env === EnvironmentEnum.Local){
    baseUrl = "http://localhost:"+((sandbox)?"3046":"3045");
  }else if(env && env === EnvironmentEnum.Release){
    baseUrl = "https://api."+((sandbox)?"sandbox.":"")+"asurcoin.com";
  }else{
    baseUrl = "https://api."+((sandbox)?"sandbox.":"")+"dawicoin.com";
  }

  let whiteLogoPngSrc = baseUrl+"/images/white-logo.png";
  let logoLink = baseUrl+"/images/logo"+((sandbox)?"-sandbox":"")+".svg";
  let fallbackImgLink = baseUrl+"/images/DAWI.png";

  if(error){
    return <div className='dawicoin-react-sdk-error'>Error: {error}</div>
  }

  return (
    <div className={"dawicoin-react-sdk-comp"+((sandbox)?" sandbox":"")}>
      <div className='dawicoin-payment-button-container' onClick={() => {
          openWindow({env,sandbox,priceUid,euid});
          setShow(true)
        }}>
        <div className='dawicoin-payment-button'>
          <div className='dawicoin-icon'>
            <svg width="48" height="48">       
              <image href={logoLink} src={fallbackImgLink} width="48" height="48"/>    
            </svg>
          </div>
          <div className='dawicoin-text'>
            <div>Pay with Crypto</div>
            <span>{cashback}% Cashback</span>
          </div>
        </div>
        {(loading)?<div>loading...</div>:null}
        <div className='dawicoin-accepted-coins'>
          {coins.map((v,i) => {
            let baseUrl = "";
            if(env && env === EnvironmentEnum.Local){
              baseUrl = "http://localhost:"+((sandbox)?"3046":"3045");
            }else if(env && env === EnvironmentEnum.Release){
              baseUrl = "https://api."+((sandbox)?"sandbox.":"")+"asurcoin.com";
            }else{
              baseUrl = "https://api."+((sandbox)?"sandbox.":"")+"dawicoin.com";
            }
            let src = baseUrl+'/images/'+v+'.png';
            return (
              <img key={i} src={src}/>
            )
          })}
        </div>
        <div className='dawicoin-powered-by'>Powered by Dawicoin</div>
      </div>

      <div className={show?"show":"hide"} id='dawicoin-gray-screen-div'>
        <div id='dawicoin-gray-screen-div-close' onClick={() => {
          if(newWindow){
            newWindow.close();
          }
          setShow(false)
          setNewWindow(null);
        }}></div>
        <div id='dawicoin-gray-screen-div-inner' onClick={() =>{
          if(newWindow){
            newWindow.close();
          }
          openWindow({env,sandbox,priceUid,euid});
          setShow(true)
        }}>
          <div className='dawicoin-gray-screen-logo'>
            <img src={whiteLogoPngSrc} alt='dawicoin'/>
            <div>dawicoin</div>
          </div>
          <p>Don’t see the secure dawicoin browser? We\’ll help you re-launch the window to complete your purchase</p>
          <p>Click to Continue</p>
        </div>
      </div>
    </div>
  );

};

export default DawicoinButton;