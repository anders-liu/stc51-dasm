(function () {

    /*= 全局函数 =*/

    function set_globals() {
        _w = window;
        _d = _w.document;
        _wk = new Worker("worker.js");

        el_hi = _d.getElementById("hex_input");
        el_wm = _d.getElementById("worker_msg");
        el_nl = _d.getElementById("nav_list");
        el_v = _d.getElementById("viewer");
    }

    function resetUI() {
        el_wm.innerHTML = "";
        el_nl.innerHTML = "";
        el_v.innerHTML = "";
    }

    function reg_events() {
        _wk.onmessage = handle_worker_message;
        el_hi.addEventListener("change", handle_hex_input_change);
    }

    /*= 事件处理器 =*/

    function handle_worker_message(evt) {
        if (!evt.data || !evt.data.msg) return;

        switch (evt.data.msg) {
            case "MSG":
                om_msg(evt.data);
                break;
        }
    }

    function handle_hex_input_change(evt) {
        if (!(el_hi.files && el_hi.files[0])) return;

        resetUI();
        _wk.postMessage({
            msg: "SET_FILE",
            file: el_hi.files[0]
        });
    }

    /*= Worker message处理器 =*/

    function om_msg(d) {
        el_wm.innerText = d.text;
    }

    /*= 初始化 =*/
    set_globals();
    reg_events();
})();