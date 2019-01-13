(function () {
    function om_set_file(d) {
        postMessage({
            msg: "MSG",
            text: d.file.name
        });
    }

    onmessage = function (evt) {
        if (!(evt.data && evt.data.msg)) return;

        switch (evt.data.msg) {
            case "SET_FILE":
                om_set_file(evt.data);
                break;
        }
    };
    postMessage({
        msg: "MSG",
        text: "worker is alive"
    });
})();