const log = console.log.bind(console)
const config = require('../data/config')
// 引入 express 并且创建一个 express 实例赋值给 app
const fs = require('fs')
const mongo = require('./mongo.js')
const express = require('express')
const bodyParser = require('body-parser')
const session = require('cookie-session')

// 先初始化一个 express 实例
const app = express()

// 设置 bodyParser
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// 设置 session
app.use(session({ secret: config.key, }))

// 公共 文件
app.use(express.static('public'))

// 引入 sms API
const Alidayu = require('super-alidayu')
const client = new Alidayu({
    app_key: config.alidayu.app_key,
    secret:  config.alidayu.secret
})

// 摘要 算法
const crypto = require('crypto')
const sha1 = (password,salt='') => {
    const mode = 'sha1'
    let _init = function(str) {
        let hash = crypto.createHash(mode)
        hash.update(str)
        let hex = hash.digest('hex')
        return hex
    }
    let hash = _init(password)// hash
    return _init(hash + config.key) // 加盐
}
const enAes256 = (str, salt='') => {
    const mode = 'aes-256-cbc'
    let aes = crypto.createCipher(mode, config.key)
    let result = aes.update(str, 'utf8', 'hex')
    return result + aes.final('hex')
}
const deAes256 = (str, salt='') => {
    const mode = 'aes-256-cbc'
    let deAes = crypto.createDecipher(mode, config.key)
    let result = deAes.update(str, 'hex', 'utf8')
    return result + deAes.final('utf8')
}

// User 保存注册未完成信息
let User = {}
const Mer = {
    SMS: function() {
        return String(parseInt(Math.random()*(10000-1000)+1000))
    },
    cookie: function(req) {
        // Cookie
        let arr = req.headers.cookie.split('; ')
        let cookie = {}
        for (let i of arr) {
            let e = i.split('=')
            cookie[e[0]] = decodeURIComponent(e[1])
        }
        return cookie
    },
    login: async function(cookie) {
        let i = {
            login: false,
            text: ""
        }
        let data = await mongo.load({
            $or: [
                {name: cookie.name},
                {phone: cookie.name}
            ]
        })
        if (data) {
            if (data.key === cookie.key) {
                i.data = data
                i.login = true
                i.text = "欢迎回来"
            } else {
                i.text = "密码错误！"
            }
        } else {
            i.text = "名字错误！"
        }
        return i
    }
}

// 主页
app.get('/', (req, res) => {
    let data
    let host = req.headers.host.split(':')[0]
    if (host === 'localhost' || host === '127.0.0.1') {
        data = fs.readFileSync('www/server.html', 'utf8')
    } else {
        data = fs.readFileSync('www/index.html', 'utf8')
    }
    res.send(data)
})
// 任意门
app.post('/door', function (req, res) {
    let random = function(obj) {
        let arr = Object.keys(obj)
        let i = parseInt(Math.random() * arr.length)
        return arr[i]
    }
    let data = JSON.parse(fs.readFileSync('data/user/13509185504.json', 'utf8'))
    let kind = 'books'
    let cls = random(data[kind])
    let url = ''
    if (Object.keys(data[kind][cls]).length) {
        let key = random(data[kind][cls])
        url = 'http://'+ data[kind][cls][key].url
    }
    res.send(url)
})

// 加载
app.post('/user/load', async function (req, res) {
    let notLogin = async function() {
        let data = await mongo.load({
            phone: "18966702120"
        })
        data.note = ''
        res.send({
            "user": data.mer,
            "text": '请输入名字',
            "login": false
        })
    }
    if (req.headers.cookie) {
        let cookie = Mer.cookie(req)
        let i = await Mer.login(cookie)
        if (i.login) {
            // 登录成功
            let data = i.data
            res.send({
                "user": data.mer,
                "text": "欢迎回来",
                "login": true,
                "name": data.name,
                "phone": data.phone,
                "key": data.key
            })
        } else {
            notLogin()
        }
    } else {
        notLogin()
    }
})
// 存储
app.post('/user/save', async function (req, res) {
    if (req.headers.cookie) {
        let cookie = Mer.cookie(req)
        let i = await Mer.login(cookie)
        if (i.login) {
            let data = i.data
            data.mer = req.body
            let err = await mongo.save(data)
            // 写入成功！
            if (err.ok) {
                res.send(err.message)
            }
        }
    }
})
// 登录
app.post('/user/login', async function (req, res) {
    let cookie = Mer.cookie(req)
    let i = await Mer.login(cookie)
    if (i.login) {
        let data = i.data
        res.send({
            "user": data.mer,
            "text": '欢迎回来',
            "login": true,
            "name": data.name,
            "phone": data.phone,
            "key": data.key
        })
    } else {
        res.send({
            "text": i.text,
            "login": false
        })
    }
})
// 注册
app.post('/user/join-sms', async function (req, res) {
    let phone = req.body.phone
    let data = await mongo.load({
        phone: phone
    },["phone"])
    if (data) {
        res.send({send:false, text:'已注册，请登录'})
    } else {
        User[phone] = {}
        User[phone].sms = Mer.SMS()
        // 发送短信 promise 方式调用
        let options = {
            sms_free_sign_name: config.alidayu.sms_free_sign_name,
            sms_param: {
                "number": User[phone].sms
            },
            "rec_num": phone,
            sms_template_code: config.alidayu.sms_template_code
        }
        // 花钱的地方来了 take money this
        client.sms(options)
            .then(function(data) {
                res.send({send:true, text:'短信已发送，请耐心等候'})
            }).catch(function(err) {
                res.send({send:true, text:'短信发送失败，请联系管理员'})
            })
    }
})
app.post('/user/join', function (req, res) {
    let phone = req.body.phone
    let sms = req.body.sms
    if (User[phone]) {
        if (sms === User[phone].sms) {
            res.send({
                join: true,
                text: '欢迎加入，不知阁下如何称呼'
            })
        } else {
            res.send({
                join: false,
                text: '短信验证错误'
            })
        }
    } else {
        res.send({
            join: false,
            text: '手机号错误'
        })
    }
})

app.post('/user/join-name', async function (req, res) {
    // 读取
    let name = await mongo.find({},["name"])
    // 检查名字
    let bool = false
    for (let i of name) {
        // 忽略大小写
        if (i.name.toLowerCase() === req.body.name.toLowerCase()) {
            bool = true
            break
        }
    }
    if (bool) {
        res.send({
            "add": false,
            "text": (req.body.name + ' 已被占用')
        })
    } else {
        // 读取
        let sea = await mongo.load({phone: "18966702120"}, ["mer"])
        let data = {
            mer: sea.mer,
            name: req.body.name,
            key: req.body.phone.slice(-4),
            phone: req.body.phone
        }
        data.mer.note = '🍓' + req.body.name + '\n'
        // 写入
        let err = await mongo.save(data)
        if (err.ok) {
            delete User[req.body.phone]
            res.send({
                "add": true,
                "text": '注册成功！'
            })
        } else {
            res.send({
                "add": false,
                "text": '写入失败！'
            })
        }
    }
})

// MarkDown
app.get( '/md/:id?', function(req, res) {
    let data = fs.readFileSync('public/md/md.html', 'utf8')
    res.send(data)
})
// 加载
app.post('/md/load/:id?', function(req, res) {
    let id = req.params.id
    let path = 'data/note/' + id + '.json'
    let data
    if (fs.existsSync(path)) {
        data = fs.readFileSync(path, 'utf8')
    } else {
        data = fs.readFileSync('data/note/default.json', 'utf8')
    }
    res.send(data)
})
// 存储
app.post('/md/save', function(req, res) {
    let id = req.body.id || ''
    let path = 'data/note/' + id + '.json'
    // 如果路径无效则存储到默认
    if (fs.existsSync(path) === false) {
        path = 'data/note/default.json'
    }
    let data = JSON.stringify(req.body.json, null, 2)
    if (fs.existsSync(path)) {
        fs.writeFileSync(path, data, 'utf8')
        res.send('写入成功！')
    } else {
        res.send('写入失败！')
    }
})

// 404
app.use((req, res) => {
    res.status(404)
    res.send(fs.readFileSync('public/404.html', 'utf8'))
})
// 500
app.use((err, req, res, next) => {
    console.error('出现错误', err.stack)
    res.status(500)
    res.send('<h1>出现错误 Status:500</h1>')
})


// let _init = async () => {
//     console.time('初始化')
//     const arr = JSON.parse(fs.readFileSync('data/user/phone.json', 'utf8'))
//     for (let i of Object.keys(arr)) {
//         let e = arr[i]
//         const obj = JSON.parse(fs.readFileSync(`data/user/${i}.json`, 'utf8'))
//         const data = {
//             mer: obj,
//             name: e.name,
//             phone: i,
//             key: e.key,
//             mark: e.mark || ''
//         }
//         let err = await mongo.save(data)
//         log(err)
//     }
//     console.timeEnd('初始化')
// }
// _init()
// mongo.find({}).then((data) => {
//     log(data)
// })

// listen 函数监听端口
let server = app.listen(1207, function () {
  let host = server.address().address
  let port = server.address().port
  console.log("应用实例，访问地址为 http://%s:%s", host, port)
})
