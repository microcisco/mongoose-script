const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

const native = 'native';  //无需处理的filterHelpFile.operate标识
/**
 * @property {String} url
 * @property {String} dbName
 * */
let initData = {};  //初始化数据
let client = null;  //数据库session

/**
 * @public
 * @function
 * @description 初始化
 * @param {String} url
 * @param {String} dbName
 * */
async function init(url, dbName) {
    if (!url || !dbName) throw new Error('init Data invalid must has url and dnName');
    initData.url = url;
    initData.dbName = dbName;
    client = await new Promise((resolve, reject) => {
        return MongoClient.connect(initData.url, function (err, client) {
            if (err) {
                reject(err);
                return;
            }
            resolve(client);
        });
    });
}

/**@class*/
class FilterHelpFile {
    get fieldName() {
        return this._fieldName;
    }

    set fieldName(value) {
        this._fieldName = value;
    }

    get operate() {
        return this._operate;
    }

    set operate(value) {
        this._operate = value;
    }

    get fieldValue() {
        return this._fieldValue;
    }

    set fieldValue(value) {
        this._fieldValue = value;
    }

    constructor(
        fieldName = '',
        operate = '',
        fieldValue = '',
    ) {
        this._fieldName = fieldName;
        this._operate = operate;
        this._fieldValue = fieldValue;
    }

}

/**@class*/
class ORMFilter {
    constructor() {
        this._arrCondition = [];
    }

    /**@public
     * @method
     * @description 添加条件
     * @param {FilterHelpFile} filterHelpFile
     * */
    addCondition(filterHelpFile) {
        if (!filterHelpFile instanceof FilterHelpFile) throw new Error('type must filterHelpFile');
        this._arrCondition.push(filterHelpFile);
    }

    /**@public
     * @method
     * @description 返回条件
     * */
    getConditions() {
        return this._arrCondition;
    }

}

/**@class*/
class Manager {
    /**@constructor*/
    constructor(entity) {
        if (!client) throw new Error('mongodb init fail or not init');
        if (!entity instanceof Model) throw new Error('type must Model');
        this._client = client;
        /**@type {Model}*/
        this.entity = entity;
        //筛选器管理
        this.ormFilter = new ORMFilter();
        //排序
        this.sort = {};
    }

    /**@public
     * @method
     * @description 格式化为mongodb查询条件
     * @param {FilterHelpFile} filterHelpFile
     * @param {Object} findCondition
     * */
    static formatFind(filterHelpFile, findCondition) {
        if (!filterHelpFile instanceof FilterHelpFile) throw new Error('');
        if (filterHelpFile.fieldName === '_id') filterHelpFile.fieldValue = ObjectId(filterHelpFile.fieldValue);  //mongodb的_id字段要转义
        switch (filterHelpFile.operate) {
            case native:  //已经处理过的
                for (let key in filterHelpFile.fieldValue) {
                    if (filterHelpFile.fieldValue.hasOwnProperty(key)) {
                        findCondition[key] = filterHelpFile.fieldValue[key];
                    }
                }
                break;
            case 'exact':
                findCondition[filterHelpFile.fieldName] = filterHelpFile.fieldValue;
                break;
            case 'contains':
                findCondition[filterHelpFile.fieldName] = {"$in": filterHelpFile.fieldValue};
                break;
            case 'in':
                findCondition[filterHelpFile.fieldName] = {"$in": filterHelpFile.fieldValue};
                break;
            case 'nin':
                findCondition[filterHelpFile.fieldName] = {"$nin": filterHelpFile.fieldValue};
                break;
            case 'gt':
                findCondition[filterHelpFile.fieldName] = {"$gt": filterHelpFile.fieldValue};
                break;
            case 'gte':
                findCondition[filterHelpFile.fieldName] = {"$gte": filterHelpFile.fieldValue};
                break;
            case 'lt':
                findCondition[filterHelpFile.fieldName] = {"$lt": filterHelpFile.fieldValue};
                break;
            case 'lte':
                findCondition[filterHelpFile.fieldName] = {"$lte": filterHelpFile.fieldValue};
                break;
            case 'ne':
                findCondition[filterHelpFile.fieldName] = {"$ne": filterHelpFile.fieldValue};
                break;
            case 'exists':
                findCondition[filterHelpFile.fieldName] = {"$exists": !!filterHelpFile.fieldValue};
                break;
            case 'startSwitch':
                findCondition[filterHelpFile.fieldName] = {"$regex": '^' + filterHelpFile.fieldValue};
                break;
            case 'endSwitch':
                findCondition[filterHelpFile.fieldName] = {"$regex": filterHelpFile.fieldValue + '$'};
                break;
            case 'regex':
                findCondition[filterHelpFile.fieldName] = {"$regex": filterHelpFile.fieldValue};
                break;
            default:
                break;
        }
    }

    /**@public
     * @method
     * @description 格式化条件
     * @param {Object} condition
     * @param {Array} container
     * */
    static formatCondition(condition, container) {
        const operates = [
            'exact',  //等于
            'contains',  //包含
            'startSwitch',  //开头
            'endSwitch',  //结尾
            'in',  //范围内
            'nin',  //不在范围内
            'gt',  //大于
            'gte',  //大于等于
            'lt',  //小于
            'lte',  //小于等于
            'ne',  //不等于
            'exists',  //存在
            'regex',  //存在
        ];
        //校验
        for (let key in condition) {
            if (condition.hasOwnProperty(key)) {
                let strings = key.split('__');
                let operate = strings[1] || 'exact';
                if (~operates.indexOf(operate)) {
                    //合法筛选条件
                    container.push(new FilterHelpFile(strings[0], operate, condition[key]));
                }
            }
        }
    }

    /**@public
     * @method
     * @description 格式化插入数据
     * @param {Model} entity
     * @param {Number} [model] 0:新增模式 1:更新模式
     * */
    static formatInsertData(entity, model) {
        let data = {};
        for (let key in entity) {
            if (entity.hasOwnProperty(key)) {
                if (
                    Array.isArray(entity._slots) &&
                    !~entity._slots.indexOf(key)
                ) {  //定义了slots属性 && 优先匹配slots
                    continue;
                } else {  //未定义了slots属性 && 过滤以"_"打头的字段
                    if (key.length <= 0 || key[0] === '_') continue;
                }
                if (model === 1 && key === '_id') continue;  //更新文档 && 过滤_id
                if (entity[key] instanceof Manager) continue;  //过滤ORM管理类
                if (entity[key] instanceof ORMFilter) continue;  //过滤ORM过滤条件类
                data[key] = entity[key];
            }
        }
        return data;
    }

    /**@public
     * @method
     * @description 查询全部
     * */
    async all() {
        let findCondition = {};  //查询条件
        for (/**@type FilterHelpFile*/let condition of this.ormFilter.getConditions()) {
            Manager.formatFind(condition, findCondition);
        }
        let documents = this.entity.getTableName() || this.entity['constructor'].name;
        const collection = this._client.db(initData.dbName).collection(documents);
        return new Promise((resolve, reject) => {
            collection.find(findCondition).sort(this.sort).toArray(function (err, docs) {
                if (err) {
                    reject(err);
                    return;
                }
                let res = [];
                for (let i = 0; i < docs.length; ++i) {
                    let obj = docs[i];
                    let model = new this.entity.constructor();
                    for (let key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            model[key] = obj[key];
                        }
                    }
                    model.resetManager(this);
                    this.entity = model;
                    res.push(model);
                }
                resolve(res);
            }.bind(this));
        });
    }

    /**@public
     * @method
     * @description 逻辑或过滤
     * @param {Object} condition
     * @return {Manager}
     * */
    filterQ(condition) {
        let arr = [];
        Manager.formatCondition(condition, arr);
        let arrFind = [];
        arr.forEach(it => {
            let res = {};
            Manager.formatFind(it, res);
            arrFind.push(res);
        });
        this.ormFilter.addCondition(new FilterHelpFile('', native, {'$or': arrFind}));
        return this;
    }

    /**@public
     * @method
     * @description 逻辑与过滤
     * @param {Object} condition
     * @return {Manager}
     * */
    filter(condition) {
        Manager.formatCondition(condition, this.ormFilter.getConditions());
        return this;
    }

    /**@public
     * @method
     * @description 返回单个满足条件对象
     * @return {Model}
     * */
    async get() {
        let res = await this.all();
        if (res.length <= 0) return null;
        if (res.length > 1) throw new Error('MultipleObjectsReturned');
        return res.pop();
    }

    /**@public
     * @method
     * @description 排序
     * @param {String} key
     * @param {Number} code 1:升序 -1:降序
     * @return {Manager}
     * */
    order_by(key, code) {
        if (typeof key !== 'string') throw new Error('type must string');
        let order = -1;
        if (code === -1 || code === 1) order = code;
        this.sort = {};
        this.sort[key] = order;
        return this;
    }

    /**@public
     * @method
     * @description 保存文档
     * */
    async saveDocument() {
        let documents = this.entity.getTableName() || this.entity['constructor'].name;
        const collection = this._client.db(initData.dbName).collection(documents);
        return await new Promise((resolve, reject) => {
            collection.insertMany([Manager.formatInsertData(this.entity)], function (err, result) {
                if (err) {
                    reject(err);
                    return
                }
                if (result.result.ok === 1 && result.result.n === 1) this.entity._id = result.ops["0"]._id.toString();
                resolve(result);
            }.bind(this));
        });
    }

    /**@public
     * @method
     * @description 删除文档
     * */
    async deleteDocument() {
        let doc = this.entity;
        if (!doc._id) throw new Error('invalid document id');
        let documents = this.entity.getTableName() || this.entity['constructor'].name;
        const collection = this._client.db(initData.dbName).collection(documents);
        return await new Promise((resolve, reject) => {
            collection.deleteOne({_id: ObjectId(doc._id)}, function (err, result) {
                if (err) {
                    reject(err);
                    return
                }
                resolve(result);
            });
        });
    }

    /**@public
     * @method
     * @description 保存文档
     * */
    async updateDocument() {
        let doc = this.entity;
        if (!doc._id) throw new Error('invalid document id');
        let documents = this.entity.getTableName() || this.entity['constructor'].name;
        const collection = this._client.db(initData.dbName).collection(documents);
        return await new Promise((resolve, reject) => {
            collection.updateOne({_id: ObjectId(doc._id)}, {'$set': Manager.formatInsertData(this.entity)}, function (err, result) {
                if (err) {
                    reject(err);
                    return
                }
                resolve(result);
            });
        });
    }
}

/**@class
 * */
class Model {
    /**@public
     * @method
     * @description 数据库中对应的表名或者集合名
     * */
    getTableName() {

    }

    /**
     * @constructor
     * */
    constructor() {
        this._slots = void 0;  //限制存储mongodb的数据，默认存储除非"_"打头和非Manager类型的字段
        this._manager = this.objects = new Manager(this);
    }

    /**@public
     * @method
     * @description 保存到数据库
     * @param {Manager} manager
     * */
    resetManager(manager) {
        this._manager = this.objects = manager;
    }

    /**@public
     * @method
     * @description 保存到数据库
     * */
    async save() {
        return await this._manager.saveDocument()
    }

    /**@public
     * @method
     * @description 从数据库中删除
     * */
    async delete() {
        return await this._manager.deleteDocument()
    }

    /**@public
     * @method
     * @description 从数据库中跟新
     * */
    async update() {
        return await this._manager.updateDocument()
    }

}

module.exports = {
    init: init,
    FilterHelpFile: FilterHelpFile,
    ORMFilter: ORMFilter,
    Manager: Manager,
    Model: Model,
};