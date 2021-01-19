const params = new URLSearchParams(document.location.href.split('?')[1] );
const ASSET_CATEGORY = 'layer'; // composite, or all
const IMAGE_URI = 'https://artparty.ctlprojects.com';
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

export const getRandomImage = async () => {
    const asset = await getRandomResult();
    return getAssetImage(asset);
}

const fetchAssetSet = () => {
    const serverUrl = `https://artparty.ctlprojects.com/list/${ASSET_CATEGORY}?__do_not_cache__=${Date.now()}&count=${ASSETS_PER_FETCH}&random=${Date.now()}`;
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
