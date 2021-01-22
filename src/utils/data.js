import EventBus from '../eventbus.js';

const params = new URLSearchParams(document.location.href.split('?')[1] );
const ASSET_CATEGORY = 'layer'; // composite, or all
const IMAGE_URI = ' https://artparty2021.hooperstreetprojects.com';
const ASSETS_PER_FETCH = 30;

let assets = [];

export const getRandomResult = async () => {
    if (assets.length === 0) {
        const results = await fetchAssetSet();
        if (results.assets) {
            assets = results.assets;
        }
    }
    return assets.pop();
}

export const submitImageFromCanvas = (canvas, firstname, lastinitial, age) => {
    const encoded = canvas.toBlob( (result) => {
        const fd = new FormData();
        fd.append("image", result, 'remix');
        fd.append('first_name', firstname);
        fd.append('last_initial', lastinitial);
        fd.append('age', age);
        fetch(`https://artparty2021.hooperstreetprojects.com/submit/composite`, {
            method: 'POST',
            body: fd,
        })
            .then((result) => result.json())
            .then((data) => {
                new EventBus().dispatchEvent(new CustomEvent('uploadcomplete'));
                window.location = 'http://adobe.deyoungsters.com';
            }).catch(error => {
                new EventBus().dispatchEvent(new CustomEvent('uploadfailed'));
                alert('Sorry there was an issue submitting your remix, please try again. And if you keep having problems, try back later or download your remix and send it to specialevents@famsf.org');
            })
    }, 'image/jpeg');
}

const fetchAssetSet = () => {
    const serverUrl = ` https://artparty2021.hooperstreetprojects.com/list/${ASSET_CATEGORY}?__do_not_cache__=${Date.now()}&count=${ASSETS_PER_FETCH}&random=${Date.now()}`;
    const targetUrl = params.has('dataurl') ? params.get('datarul') || './assets/sampledata.json' : serverUrl;
    const proxyUrl = params.has('proxy') ? (params.get('proxy') || 'https://cors-anywhere.herokuapp.com') : undefined;
    const uri = proxyUrl ? `${proxyUrl}/${targetUrl}` : `${targetUrl}`;

    return fetch(uri)
        .then(blob => blob.json())
        .then(data => {
            return data;
        })
        .catch(e => {
            console.error(e);
            return e;
        });
}

export const getAssetImage = (item) => {
    return `${IMAGE_URI}/image/${item.asset_type}/${item.unique_id}`;
}
