const defaultPayload = require('./payload-example');
const pointer = require('json-pointer');

class Event {
    constructor (payload, type) {
        if (!payload) {
            if (!type) type = 'input';
            // deep clone
            payload = JSON.parse(JSON.stringify(defaultPayload[type]));
        }
        this.payload = payload;
    }

    /**
     * updates event's payload
     * @param objData
     * @return {Event}
     * @mutable
     */
    update (objData) {
        const ops = Event.genOps('', objData, this.payload);
        this.payload = Event.pointUpdate(this.payload, ops);
        return this;
    }

    /**
     * returns event's payload with mods
     * @param {Object} [ownData]
     * @return {Event}
     */
    get (ownData) {
        const data = Object.assign({}, this.payload);
        const ops = Event.genOps('', ownData || {}, data);
        return Event.pointUpdate(data, ops);
    }

    static genOps (pathPrefix, props, origin) {
        if (!pathPrefix) pathPrefix = '';
        let ops = [];
        Object.keys(props).forEach(propName => {
            const val = props[propName];
            const path = (pathPrefix ? pathPrefix : '') + '/' + propName.replace('/', '~1');
            if (val === null || typeof val === 'undefined' && origin.hasOwnProperty(propName)) {
                ops.push({op: 'remove', path: path})
            } else {
                const originVal = origin[propName];

                if (typeof val === 'object') {
                    ops = ops.concat(this.genOps(path, val, originVal || {}))
                } else if (origin.hasOwnProperty(propName)) {
                    if (originVal !== val) {
                        ops.push({op: 'replace', path: path, value: val});
                    }
                } else {
                    ops.push({op: 'add', path: path, value: val});
                }
            }
        });
        return ops;
    }

    /**
     * updates object via ops
     * @param {{op: string, path: string, val: *}[]} ops
     * @return {Event}
     */
    static pointUpdate (obj, ops) {
        if (!Array.isArray(ops)) ops = [ops];
        ops.forEach(({op, path, value}) => {
            switch (op) {
                case 'add':
                case 'replace':
                    pointer.set(obj, path, value);
                    break;
                case 'remove':
                    pointer.remove(obj, path);
                    break;
                default:
                    pointer[op](obj, path, value);
            }
        });
        return obj;
    }


}

module.exports = {
    EventPayload: Event
};
