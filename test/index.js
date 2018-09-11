let mongoose = require('../index');

const url = 'mongodb://192.168.88.128:27017';
const dbName = 'django';

class Test extends mongoose.Model {

}

async function main() {
    await mongoose.init(url, dbName);

    /**@mongoose.Model*/
    let test = new Test();
    test.name = 'test';
    let res = await test.objects.filter({name:'test', age__gte:18}).filterQ({p1:1, p2:3}).get();

}

main();