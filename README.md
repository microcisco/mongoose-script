# mongoose-script 
[![travis][travis-image]][travis-url] [![downloads][downloads-image]][downloads-url] [![javascript style guide][standard-image]][standard-url]

[travis-image]: https://img.shields.io/travis/feross/safe-buffer/master.svg
[travis-url]: https://github.com/microcisco/mongoose-script
[npm-image]: https://img.shields.io/npm/v/safe-buffer.svg
[npm-url]: https://github.com/microcisco/mongoose-script
[downloads-image]: https://img.shields.io/npm/dm/safe-buffer.svg
[downloads-url]: https://github.com/microcisco/mongoose-script
[standard-image]: https://img.shields.io/badge/code_style-standard-brightgreen.svg
[standard-url]: https://github.com/microcisco/mongoose-script

### 简介
各位大佬看到这个项目的名字不要喷我哈，我只是想蹭一下mongoose热度让更多人看到而已...至于好不用好用过了就知道了。
整体设计借(chao)鉴(xi)的django，写这个也是一时兴起，前后大概花了一天左右，crud已经完美封装，大部分的需求肯定是
没有问题的后面有空会加上惰性查询、查询缓存、N对象、以及丰富聚合接口等待。

#### orm for mongodb

**使用面向对象的方式操作mongodb数据库**

## install

```
npm mongoose-script
```

## usage

继承Model即可，默认所有对象属性都会被存入Document,如果有部分属性不想存入则重写_slots字段即可，具体可参考python的
__slots__魔法方法,另外字段属性不要用“_id”和任何__打头的名字

```js
const url = 'mongodb://192.168.88.128:27017';
const dbName = 'django';

class Test extends mongoose.Model {

}

async function main() {
    await mongoose.init(url, dbName);

    /**@mongoose.Model*/
    let test = new Test();
    test.name = 'test';
    test.save();

}

main();
```

## api

### 查询过滤器
<!-- YAML
added: v1.0.0
-->

* `exact` {等于}
* `contains` {包含}
* `startSwitch` {开头}
* `endSwitch` {结尾}
* `in` {范围内}
* `nin` {不在范围内}
* `gt` {大于}
* `gte` {大于等于}
* `lt` {小于}
* `lte` {小于等于}
* `ne` {不等于}
* `exists` {存在}
* `regex` {存在}

目前有两种过滤方式一种是filter(AND逻辑),另一种是filterQ(OR逻辑)，支持链式调用。m目前获取数据有两个接口一个是
all，一个是get，get接口如果没有数据则返回null如果有多个数据会抛出MultipleObjectsReturned错误
.

```js
    /**@mongoose.Model*/
    let test = new Test();
    test.name = 'test';
    let res = await test.objects.filter({name:'test', age__gte:18}).filterQ({p1:1, p2:3}).get();
```


## links

- [git](https://github.com/microcisco/mongoose-script)