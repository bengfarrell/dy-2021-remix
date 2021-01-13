import EventListener from './eventlistener.js';

let _instance = null;

export default class EventBus extends EventListener {
    constructor() {
        super();
        if(!_instance){
            _instance = this;
        }
        return _instance;
    }

    get instance() {
        if (!_instance) {
            _instance = new EventBus();
        }
        return _instance;
    }
}
