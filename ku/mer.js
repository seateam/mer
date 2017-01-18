// 定义 log enSure
var log = function() {
        console.log.apply(console, arguments)
    }
var ckXian = function() {
    var body  = document.querySelector('body')
    var style ='<style id="xm" media="screen"> * {outline: 1px red dashed} </style>'
    var i = false
    body.addEventListener('keydown', function(event) {
        if (event.keyCode === 77 && event.ctrlKey) {
            if (i) {
                var styletog = document.querySelector('#xm')
                styletog.remove()
                i = false
            } else {
                body.insertAdjacentHTML('afterbegin', style)
                i = true
            }
        }
    })
}()

// data.json = engines | tags | stars

// 构建 Html
var __initTop__ = function() {
    var html =
        '<div class="top-center">' +
            '<top id=""><i class="iconfont icon-login fa-lg"></i>登录</top>' +
            '<top id="back">⁄(⁄ ⁄•⁄ω⁄•⁄ ⁄)⁄</top>' +
            '<top id=""><i class="iconfont icon-stars fa-lg"></i>收藏</top>' +
        '</div>'
    $('#top').html(html)
}()
var __initMain__ = function(engines, def, key) {
    var e = engines[def][key]
    var html = `
        <div class="search">
            <logo><i data-cls="${def}" data-key="${key}" style="color:${e.color};" class="fa-5x iconfont icon-dahai"></i></logo>
            <input id="search-input" type="text" maxlength="140"><button id="search-button">
                <i class="fa-lg iconfont icon-search" aria-hidden="true"></i>
            </button>
        </div>
        <div class="more">
            <ul id="more-ul"></ul><div id="more-i">
                <button id="more-button">
                    <i class="transparent fa-1x iconfont icon-down" aria-hidden="true"></i>
                </button>
            </div>
        </div>`
    $('#main').html(html)
}(Mer.engines, '综合', '')
var __initEngine__ = function(engines, def) {
    var kindHtml = ''
    for (var cls in engines) {
        kindHtml += `<tag>${cls}</tag>`
    }
    var showHtml = ''
    for (var key in engines[def]) {
        var e = engines[def][key]
        if (e.icon) {
            showHtml += `<engine data-cls="${def}" data-key="${key}"><i style="color:${e.color}" class="fa-logo iconfont icon-${e.icon}"></i></engine>`
        } else {
            showHtml += `<engine data-cls="${def}" data-key="${key}"><span style="color:${e.color}">${key}</span></engine>`
        }
    }
    var html = `
    <div class="kind">${kindHtml}</div>
    <div class="show">${showHtml}</div>`
    $('#engine').html(html)
}(Mer.engines, '综合')

// 顶部
$('logo').on('click', function() {
    $('#main').slideUp(618)
    setTimeout("$('#engine').slideDown(618);$('#top').show()", 618)
})
$('#back').on('click', function() {
    $('#top').hide()
    $('#engine').slideUp(382)
    setTimeout("$('#main').slideDown(382)", 382)
})

// 输入 - 智能联想
var moreHtml = ''
var now
var soGou = function(value) {
    now = -1
    //组装 URL
    var sugurl = 'https://www.sogou.com/suggnew/ajajjson?type=web&key=' + encodeURI(value)
    //回调函数
    window.sogou = {
        sug: function(json) {
            var arr = json[1]
            if (arr.length) {
                var html = ''
                for (var i = 0; i < arr.length; i++) {
                    html += '<li data-id="' + i + '">' + arr[i] +'</li>'
                }
                moreHtml = html
                $('#more-ul').html(moreHtml)
                $('#more-ul').addClass('more-border')
            } else {
                $('#more-ul').html('')
                $('#more-ul').removeClass('more-border')
            }
        }
    }
    //动态 JS脚本 cnblogs.com/woider/p/5805248.html
    $("#sug").html('<script src=' + sugurl + '></script>')
}
var UpDn = function(next) {
    var all = $('#more-ul').children()
    var old = Number(now)
    now = (now + next + all.length) % all.length
    event.target.value = all[now].innerText
    $(all[now]).addClass('li-hover')
    $(all[old]).removeClass('li-hover')
}
$('#search-input').on('blur', function() {
    event.target.placeholder = ''
    // 智能联想
    $('#more-ul').html('')
    $('#more-ul').removeClass('more-border')
})
$('#search-input').on('focus', function() {
    $('.fa-mini').remove()
    $('#more-button i').addClass('transparent')
    // 智能联想
    if (moreHtml && event.target.value) {
        $('#more-ul').html(moreHtml)
        $('#more-ul').addClass('more-border')
    }
})
$('#search-input').on('keyup', function() {
    if (event.keyCode === 13) {
        $('#search-button').click()
    } else if (event.keyCode === 38) {
        UpDn( -1 )
    } else if (event.keyCode === 40) {
        UpDn( +1 )
    } else {
        soGou(event.target.value)
    }
})
$('#search-input').on('keydown', function() {
     if (event.keyCode === 38) {
         event.preventDefault()
     }
})
$('#more-ul').on('mouseover', 'li', function() {
    var old = now
    now = Number(event.target.dataset.id)
    var all = $('#more-ul').children()

    $(all[now]).addClass('li-hover')
    $(all[old]).removeClass('li-hover')
})

// 搜索
var Search = function(value) {
    var target = $('logo i')[0] || $('logo span')[0]
    var i = target.dataset
    var e = Mer.engines[i.cls][i.key]
    var url = e.url
    if (screen.width < 768) {
        if (e.wap) {
            url = e.wap
        }
    }
    url += encodeURI(value)
    window.open(url)
}
$('#more-ul').on('mousedown', 'li', function() {
    Search(event.target.innerText)
})
$('#search-button').on('click', function() {
    var value = $('#search-input')[0].value
    if (value) {
        Search(value)
    } else {
        var input = $('#search-input')[0]
        input.placeholder = '随意门'
        input.focus()
    }
})

// 引擎
var Engine = function(target) {
    var e = target.dataset
    var i = Mer.engines[e.cls][e.key]
    var input = $('#search-input')[0]
    var html
    if (i.icon) {
        html = `<i data-cls="${e.cls}" data-key="${e.key}" style="color:${i.color};" class="fa-5x iconfont icon-${i.icon}"></i>`
        input.placeholder = e.key
    } else {
        html = `<span data-cls="${e.cls}" data-key="${e.key}" style="color:${i.color};">${e.key}</span>`
        input.placeholder = ''
    }
    $('logo').html(html)
    input.focus()
}
$('.kind').on('click', 'tag', function() {
    var engines = Mer.engines
    var cls = event.target.innerText
    var showHtml = ''
    for (var key in engines[cls]) {
        var e = engines[cls][key]
        if (e.icon) {
            showHtml += `<engine data-cls="${cls}" data-key="${key}"><i style="color:${e.color}" class="fa-logo iconfont icon-${e.icon}"></i></engine>`
        } else {
            showHtml += `<engine data-cls="${cls}" data-key="${key}"><span style="color:${e.color}">${key}</span></engine>`
        }
    }
    $('.show').html(showHtml)
})
$('.show').on('click', 'engine', function() {
    // pointer-events: none; 事件穿透
    Engine(event.target)
    $('#back').click()
})

// 迷你
var Mini = function(engines, def) {
    $('.fa-mini').remove()
    var miniHtml = ''
    var styleHtml = ''
    for (var key in engines[def]) {
        var e = engines[def][key]
        // key '' 默认
        if (e.icon && key) {
            miniHtml += `<i data-cls="${def}" data-key="${key}" class="fa-mini iconfont icon-${e.icon}"></i>`
            styleHtml += `.icon-${e.icon}:hover {color:${e.color}}`
        }
    }
    $('#more-i').append(miniHtml)
    $('style').append(styleHtml)
}
$('#more-button').on('mouseover', function() {
    $('#more-button i').removeClass('transparent')
})
$('#more-button').on('click', function() {
    Mini(Mer.engines, '综合')
})
$('#more-i').on('click', 'i.fa-mini', function() {
    Engine(event.target)
})
