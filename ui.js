(function () {
    function set_globals() {
        _w = window;
        _d = _w.document;
        el_hi = _d.getElementById("hex_input");
        el_msg = _d.getElementById("msg");
        el_hv = _d.getElementById("hex_view");
        el_bv = _d.getElementById("bin_view");
        el_av = _d.getElementById("asm_view");
        create_opcode_metadata();
    }

    function resetUI() {
        el_msg.innerHTML = "";
        el_hv.innerHTML = "";
        el_bv.innerHTML = "";
        el_av.innerHTML = "";
    }

    function reg_events() {
        el_hi.addEventListener("change", handle_hex_input_change);
    }

    function handle_hex_input_change(evt) {
        if (!(el_hi.files && el_hi.files[0])) return;
        resetUI();
        open_hex_file(el_hi.files[0]);
    }

    function open_hex_file(f) {
        let r = new FileReader();
        r.onload = evt => {
            const lines = parse_hex(r.result);
            render_hex_view(lines);

            if (lines.filter(v => v.error).length > 0) {
                return;
            }

            const data_lines = lines
                .filter(v => v.type == 0)
                .sort((a, b) => a.address - b.address);
            const byte_arr = create_byte_array(data_lines);
            render_bin_view(byte_arr);

            const asm_list = create_asm_list(byte_arr);
            apply_ref(asm_list);
            render_asm_view(asm_list);
            render_bin_view_style(asm_list);
        };
        r.readAsText(f);
    }

    function parse_hex(t) {
        const lines = t.split("\n").map((v, i) => {
            return parse_hex_line(v.trim(), i + 1);
        });

        for (const cur_ln of lines) {
            for (const ln of lines) {
                if (cur_ln.number !== ln.number && cur_ln.type === ln.type && cur_ln.address >= ln.address && cur_ln.address < ln.address + ln.count) {
                    cur_ln.error = "E_OVERLAP";
                }
            }
        }
        return lines;
    }

    function parse_hex_line(line_text, line_number) {
        let line_data = {
            text: line_text,
            number: line_number
        };

        if (!line_text) {
            return line_data;
        }

        if (!line_text.match(/^:([0-9a-f][0-9a-f])+$/i)) {
            line_data.error = "E_FORMAT";
            return line_data;
        }

        if (line_text.length < 11) {
            line_data.error = "E_TOOSHORT";
            return line_data;
        }

        const start_part = line_text.substring(0, 1);
        const count_part = line_text.substring(1, 3);
        const count = Number.parseInt(count_part, 16);

        if (line_text.length != count * 2 + 11) {
            line_data.error = "E_LENGTH";
            return line_data;
        }

        const address_part = line_text.substring(3, 7);
        const address = Number.parseInt(address_part, 16);

        const type_part = line_text.substring(7, 9);
        const type = Number.parseInt(type_part, 16);

        if (!(type === 0x00 || type === 0x01)) {
            line_data.error = "E_TYPENOTSUPPORT";
        }

        const data_part = line_text.substring(9, 9 + count * 2);
        const data = [];
        for (let p = 0; p < count * 2; p += 2) {
            data.push(Number.parseInt(data_part.substring(p, p + 2), 16));
        }

        const checksum_part = line_text.substring(line_text.length - 2, line_text.length);
        const checksum = Number.parseInt(checksum_part, 16);

        line_data.start_part = start_part;
        line_data.count_part = count_part;
        line_data.count = count;
        line_data.address_part = address_part;
        line_data.address = address;
        line_data.type_part = type_part;
        line_data.type = type;
        line_data.data_part = data_part;
        line_data.data = data;
        line_data.checksum_part = checksum_part;
        line_data.checksum = checksum;

        const sum = (count + (address >> 8) + (address & 0xFF) + type +
            data.reduce((a, c) => a + c, 0)) & 0xFF;

        const corrected_checksum = (~sum + 1) & 0xFF;
        if (line_data.checksum != corrected_checksum) {
            line_data.error = "E_CHECKSUM";
            line_data.corrected_checksum = corrected_checksum;
        }

        return line_data;
    }

    function render_hex_view(hex_lines) {
        let header = _d.createElement("h2");
        header.innerText = "hex文件内容";
        el_hv.appendChild(header);

        let table = _d.createElement("table");
        table.className = "code";

        let tbody = _d.createElement("tbody");
        hex_lines.map((v, i) => {
            let tr = _d.createElement("tr");

            let td_ln_no = _d.createElement("td");
            td_ln_no.className = "text_header";
            td_ln_no.innerText = v.number;
            tr.appendChild(td_ln_no);

            if (v.start_part && v.count_part && v.address_part && v.type_part &&
                (v.count == 0 || v.data_part) && v.checksum_part) {
                let td_start = _d.createElement("td");
                td_start.className = "hex_start";
                td_start.innerText = v.start_part;
                tr.appendChild(td_start);

                let td_cnt = _d.createElement("td");
                td_cnt.className = "hex_count";
                td_cnt.innerText = v.count_part;
                tr.appendChild(td_cnt);

                let td_addr = _d.createElement("td");
                td_addr.className = "hex_addr";
                td_addr.innerText = v.address_part;
                tr.appendChild(td_addr);

                let td_type = _d.createElement("td");
                td_type.className = "hex_type";
                td_type.innerText = v.type_part;
                tr.appendChild(td_type);

                let td_data = _d.createElement("td");
                td_data.className = "hex_data";
                td_data.innerText = v.data_part;
                tr.appendChild(td_data);

                let td_cs = _d.createElement("td");
                td_cs.className = "hex_cs";
                td_cs.innerText = v.checksum_part;
                tr.appendChild(td_cs);
            } else {
                let td_ln_txt = _d.createElement("td");
                td_ln_txt.colSpan = 6;
                td_ln_txt.innerText = v.text;
                tr.appendChild(td_ln_txt);
            }

            let td_err = _d.createElement("td");
            td_err.innerText = v.error || "";
            tr.appendChild(td_err);

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        el_hv.appendChild(table);
    }

    function render_bin_view(byte_arr) {
        let header = _d.createElement("h2");
        header.innerText = "二进制数据";
        el_bv.appendChild(header);

        let table = _d.createElement("table");
        table.className = "code";

        let tbody = _d.createElement("tbody");

        let tr_header = _d.createElement("tr");

        let td_header_header = _d.createElement("td");
        tr_header.appendChild(td_header_header);

        const cols = 16;

        for (let c = 0; c < cols; c++) {
            let td_header = _d.createElement("td");
            td_header.className = "text_header";
            td_header.innerText = "+" + format_hex(c, 2);
            tr_header.appendChild(td_header);
        }

        tbody.appendChild(tr_header);

        let tr_cur = null;
        for (let ai = 0; ai < byte_arr.length; ai++) {
            if (ai % cols == 0) {
                tr_cur = _d.createElement("tr");
                tbody.appendChild(tr_cur);

                if (byte_arr[ai].is_gap) {
                    let ni = ai;
                    while (byte_arr[++ni].is_gap);
                    let gap_len = ni - ai;
                    if (gap_len >= cols) {
                        ni = ni - ni % cols;
                        let td_header = _d.createElement("td");
                        td_header.className = "text_header";
                        td_header.innerText = format_bin_table_header(ai, ni);
                        tr_cur.appendChild(td_header);

                        for (let i = 0; i < cols; i++) {
                            let td_gap = _d.createElement("td");
                            td_gap.className = "text_header";
                            if (i == 0) {
                                td_gap.innerText = "...";
                            }
                            tr_cur.appendChild(td_gap);
                        }
                        ai = ni - 1;
                        continue;
                    }
                }

                let td_header = _d.createElement("td");
                td_header.className = "text_header";
                td_header.innerText = format_bin_table_header(ai, ai + cols);
                tr_cur.appendChild(td_header);
            }

            let td_data = _d.createElement("td");
            td_data.className = byte_arr[ai].is_gap ? "text_header" : "byte_data";
            if (!byte_arr[ai].is_gap) {
                td_data.innerText = format_hex(byte_arr[ai].data, 2);
                byte_arr[ai].table_cell = td_data;
            }
            tr_cur.appendChild(td_data);
        }

        table.appendChild(tbody);
        el_bv.appendChild(table);
    }

    function render_asm_view(asm_list) {
        let header = _d.createElement("h2");
        header.innerText = "汇编代码";
        el_av.appendChild(header);

        let table = _d.createElement("table");
        table.className = "code";

        let tbody = _d.createElement("tbody");

        /* offset: bytes|opcode|oprand1|oprand2|oprand3 */
        /* separater                                    */

        function create_tr_text(text, highlight) {
            let tr = _d.createElement("tr");
            let td_data = _d.createElement("td");
            tr.appendChild(td_data);
            let td_text = _d.createElement("td");
            if (highlight) td_text.className = "asm_hl";
            td_text.colSpan = 4;
            td_text.innerText = text;
            tr.appendChild(td_text);
            return tr;
        }

        function create_tr_gap(ci) {
            return create_tr_text("; " + ci.len + "字节空白");
        }

        function create_tr_sep(hard) {
            let tr = _d.createElement("tr");
            let td = _d.createElement("td");
            td.className = hard ? "asm_sep_hard" : "";
            td.colSpan = 5;
            td.innerHTML = hard ? "<hr/>" : "&nbsp;";
            tr.appendChild(td);
            return tr;
        }

        function create_tr_asm(ci) {
            let tr = _d.createElement("tr");

            let td_data = _d.createElement("td");
            td_data.className = "asm_data";
            td_data.innerText = format_hex(ci.offset, 4) +
                ": " + format_inst_bytes(ci.bytes);
            tr.appendChild(td_data);

            let td_opcode = _d.createElement("td");
            td_opcode.className = "asm_opcode";
            td_opcode.innerText = ci.opcode;
            tr.appendChild(td_opcode);

            let td_oprand1 = _d.createElement("td");
            if (ci.oprand1) {
                td_oprand1.className = get_oprand_css(ci, ci.oprand1);
                td_oprand1.innerText = get_oprand_str(ci.oprand1);
                if (ci.oprand2 != null) td_oprand1.innerText += ",";
            }
            tr.appendChild(td_oprand1);

            let td_oprand2 = _d.createElement("td");
            if (ci.oprand2) {
                td_oprand2.className = get_oprand_css(ci, ci.oprand2);
                td_oprand2.innerText = get_oprand_str(ci.oprand2);
                if (ci.oprand3 != null) td_oprand2.innerText += ",";
            }
            tr.appendChild(td_oprand2);

            let td_oprand3 = _d.createElement("td");
            if (ci.oprand3) {
                td_oprand3.className = get_oprand_css(ci, ci.oprand3);
                td_oprand3.innerText = get_oprand_str(ci.oprand3);
            }
            tr.appendChild(td_oprand3);

            return tr;
        }

        function format_inst_bytes(bytes) {
            let str = format_hex(bytes[0].data, 2);
            for (let i = 1; i < bytes.length; i++) {
                str += " " + format_hex(bytes[i].data, 2);
            }
            return str;
        }

        let last_inst;
        for (const inst of asm_list.inst_list) {
            if (inst.is_gap) {
                tbody.appendChild(create_tr_gap(inst));
                tbody.appendChild(create_tr_sep(true));
            } else if (inst.is_sep) {
                tbody.appendChild(create_tr_sep(inst.is_hard));
            } else {
                if (inst.refs) {
                    if (last_inst && !last_inst.is_sep && !last_inst.is_gap) {
                        tbody.appendChild(create_tr_sep(false));
                    }
                    tbody.appendChild(create_tr_text(format_code_address(inst.offset), true));
                }
                tbody.appendChild(create_tr_asm(inst));
            }
            last_inst = inst;
        }

        if (!asm_list.inst_list[asm_list.inst_list.length - 1].is_sep) {
            tbody.appendChild(create_tr_sep(true));
        }
        tbody.appendChild(create_tr_text("END"));

        table.appendChild(tbody);
        el_av.appendChild(table);
    }

    function render_bin_view_style(asm_list) {
        for (let i in asm_list.index_list) {
            const ci = asm_list.index_list[i];
            ci.bytes[0].table_cell.className = "asm_opcode";
            ci.bytes[0].table_cell.title = format_inst(ci);

            for (let bi = 1; bi < ci.bytes.length; bi++) {
                ci.bytes[bi].table_cell.className = "asm_oprand";
            }
        }
    }

    function create_byte_array(data_lines) {
        let arr = [];

        for (let i = 0; i < data_lines.length; i++) {
            const cur_ln = data_lines[i];
            for (let b of cur_ln.data) {
                arr.push({
                    data: b,
                    hex_line: cur_ln
                });
            }

            if (i < data_lines.length - 1) {
                const next_ln = data_lines[i + 1];
                for (let gi = cur_ln.address + cur_ln.count; gi < next_ln.address; gi++) {
                    arr.push({
                        is_gap: true
                    });
                }
            }
        }

        return arr;
    }

    function create_asm_list(byte_arr) {
        let inst_list = [];
        let index_list = {};

        for (let p = 0; p < byte_arr.length; p++) {
            const cb = byte_arr[p];

            if (cb.is_gap) {
                if (p > 0 && inst_list[inst_list.length - 1].is_gap) {
                    inst_list[inst_list.length - 1].len++;
                } else {
                    let ci = {};
                    ci.is_gap = true;
                    ci.len = 1;
                    inst_list.push(ci);
                }
            } else { /* !is_gap */
                let ci = {
                    offset: p
                };
                const md = opcode_metadata[cb.data];
                ci.opcode = md.opcode;
                ci.bytes = [cb];
                for (let i = 1; i < md.bytes; i++) ci.bytes.push(byte_arr[p + i]);
                if (md.oprand1) ci.oprand1 = md.oprand1;
                if (md.oprand2) ci.oprand2 = md.oprand2;
                if (md.dasm) md.dasm(ci);
                inst_list.push(ci);
                index_list[p] = ci;
                p += ci.bytes.length - 1;

                switch (ci.opcode) {
                    case "AJMP":
                    case "JMP":
                    case "LJMP":
                    case "RET":
                    case "RETI":
                    case "SJMP":
                        inst_list.push({
                            is_sep: true,
                            is_hard: true
                        });
                        break;

                    case "ACALL":
                    case "CJNE":
                    case "DJNZ":
                    case "JB":
                    case "JBC":
                    case "JC":
                    case "JNB":
                    case "JNC":
                    case "JNZ":
                    case "JZ":
                    case "LCALL":
                        inst_list.push({
                            is_sep: true
                        });
                        break;
                }
            }
        }

        return {
            inst_list,
            index_list
        };
    }

    function apply_ref(asm_list) {
        const inst_list = asm_list.index_list;
        for (let i in inst_list) {
            let ci = inst_list[i]
            const addr =
                (ci.oprand1 && ci.oprand1.type === "ADDR" && ci.oprand1.data) ||
                (ci.oprand2 && ci.oprand2.type === "ADDR" && ci.oprand2.data) ||
                (ci.oprand3 && ci.oprand3.type === "ADDR" && ci.oprand3.data);

            if (addr != null) {
                let ti = asm_list.index_list[addr];

                if(!ti) {
                    ci.target = "INVALID";
                } else {
                    ti.refs = ti.refs || [];
                    ti.refs.push(ci);
                    ci.target = ti;
                }
            }
        }
    }

    function get_oprand_css(ci, oprand) {
        return ci.target === "INVALID" ? "asm_err" :
            oprand.type === "ADDR" ? "asm_addr" : "asm_oprand";
    }

    function get_oprand_str(oprand) {
        return typeof oprand === "string" ? oprand : oprand.str;
    }

    function format_inst(ci) {
        let str = ci.opcode;
        if (ci.oprand1) str += " " + get_oprand_str(ci.oprand1);
        if (ci.oprand2) str += ", " + get_oprand_str(ci.oprand2);
        if (ci.oprand3) str += ", " + get_oprand_str(ci.oprand3);
        return str;
    }

    function format_code_address(addr) {
        return "CODE_" + format_hex(addr, 4);
    }

    function format_direct_data(data) {
        return format_hex(data, 3, true);
    }

    function format_bit_data(data) {
        return format_hex(data, 3, true);
    }

    function format_imm_data(data) {
        return "#" + format_hex(data, 3, true);
    }

    function format_imm2_data(data) {
        return "#" + format_hex(data, 5, true);
    }

    function format_bin_table_header(start, end) {
        return format_hex(start, 4) + "-" + format_hex(end - 1, 4);
    }

    function format_hex(n, len, suffix) {
        let str = n.toString(16).toUpperCase();
        if (str.length < len) {
            str = "0".repeat(len - str.length) + str;
        }
        if (suffix) {
            str = str + "h";
        }
        return str;
    }

    function calculate_rel_data(data, ci) {
        const offset = (data & 0x80) ? data - 0x100 : data;
        return ci.offset + ci.bytes.length + offset;
    }

    function create_addr_oprand(data) {
        return {
            type: "ADDR",
            data,
            str: format_code_address(data)
        };
    }

    function create_rel_oprand(data, ci) {
        const jmp_target = calculate_rel_data(data, ci);
        return {
            type: "ADDR",
            data: jmp_target,
            raw_data: data,
            str: format_code_address(jmp_target)
        };
    }

    function create_dir_oprand(data) {
        return {
            type: "DIR",
            data,
            str: format_direct_data(data)
        };
    }

    function create_bit_oprand(data) {
        return {
            type: "BIT",
            data,
            str: format_bit_data(data)
        };
    }

    function create_nbit_oprand(data) {
        return {
            type: "NBIT",
            data,
            str: "/" + format_bit_data(data)
        };
    }

    function create_imm_oprand(data) {
        return {
            type: "IMM",
            len: 1,
            data,
            str: format_imm_data(data)
        };
    }

    function create_imm2_oprand(byte1, byte2) {
        const data = (byte1 << 8) | byte2;
        return {
            type: "IMM",
            len: 2,
            data,
            str: format_imm2_data(data)
        };
    }

    function dasm_op_abs(ci) {
        /* a10 a9 a8 0 0001   a7 a6 a5 a4 a3 a2 a1 a0 */
        ci.oprand1 = create_addr_oprand(((ci.bytes[0].data & 0xE0) << 3) | ci.bytes[1].data);
    }

    function dasm_op_laddr(ci) {
        ci.oprand1 = create_addr_oprand((ci.bytes[1].data << 8) | ci.bytes[2].data);
    }

    function dasm_op_dir(ci) {
        ci.oprand1 = create_dir_oprand(ci.bytes[1].data);
    }

    function dasm_op_x_dir(ci) {
        if (!ci.bytes[1]) debugger;
        ci.oprand2 = create_dir_oprand(ci.bytes[1].data);
    }

    function dasm_op_rel(ci) {
        ci.oprand1 = create_rel_oprand(ci.bytes[1].data, ci);
    }

    function dasm_op_bit_rel(ci) {
        ci.oprand1 = create_bit_oprand(ci.bytes[1].data);
        ci.oprand2 = create_rel_oprand(ci.bytes[2].data, ci);
    }

    function dasm_op_x_imm(ci) {
        ci.oprand2 = create_imm_oprand(ci.bytes[1].data);
    }

    function dasm_op_x_imm2(ci) {
        ci.oprand2 = create_imm2_oprand(ci.bytes[1].data, ci.bytes[2].data);
    }

    function dasm_op_x_rel(ci) {
        ci.oprand2 = create_rel_oprand(ci.bytes[1].data, ci);
    }

    function dasm_op_dir_imm(ci) {
        ci.oprand1 = create_dir_oprand(ci.bytes[1].data);
        ci.oprand2 = create_imm_oprand(ci.bytes[2].data);
    }

    function dasm_op_dir_dir(ci) {
        ci.oprand1 = create_dir_oprand(ci.bytes[1].data);
        ci.oprand2 = create_dir_oprand(ci.bytes[2].data);
    }

    function dasm_op_dir_rel(ci) {
        ci.oprand1 = create_dir_oprand(ci.bytes[1].data);
        ci.oprand2 = create_rel_oprand(ci.bytes[2].data, ci);
    }

    function dasm_op_x_bit(ci) {
        ci.oprand2 = create_bit_oprand(ci.bytes[1].data);
    }

    function dasm_op_x_nbit(ci) {
        ci.oprand2 = create_nbit_oprand(ci.bytes[1].data);
    }

    function dasm_op_bit(ci) {
        ci.oprand1 = create_bit_oprand(ci.bytes[1].data);
    }

    function dasm_op_x_imm_rel(ci) {
        ci.oprand2 = create_imm_oprand(ci.bytes[1].data);
        ci.oprand3 = create_rel_oprand(ci.bytes[2].data, ci);
    }

    function dasm_op_x_dir_rel(ci) {
        ci.oprand2 = create_dir_oprand(ci.bytes[1].data);
        ci.oprand3 = create_rel_oprand(ci.bytes[2].data, ci);
    }

    function create_opcode_metadata() {
        _w.opcode_metadata = [{
            /* 0x00 */
            opcode: "NOP",
            un: "NOP",
            bytes: 1
        }, {
            /* 0x01 */
            opcode: "AJMP",
            un: "AJMP_PAGE0",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x02 */
            opcode: "LJMP",
            un: "LJMP",
            bytes: 3,
            dasm: dasm_op_laddr
        }, {
            /* 0x03 */
            opcode: "RR",
            un: "RR",
            bytes: 1,
            oprand1: "A"
        }, {
            /* 0x04 */
            opcode: "INC",
            un: "INC_A",
            bytes: 1,
            oprand1: "A"
        }, {
            /* 0x05 */
            opcode: "INC",
            un: "INC_DIR",
            bytes: 2,
            dasm: dasm_op_dir
        }, {
            /* 0x06 */
            opcode: "INC",
            un: "INC_AT_R0",
            bytes: 1,
            oprand1: "@R0"
        }, {
            /* 0x07 */
            opcode: "INC",
            un: "INC_AT_R1",
            bytes: 1,
            oprand1: "@R1"
        }, {
            /* 0x08 */
            opcode: "INC",
            un: "INC_R0",
            bytes: 1,
            oprand1: "R0"
        }, {
            /* 0x09 */
            opcode: "INC",
            un: "INC_R1",
            bytes: 1,
            oprand1: "R1"
        }, {
            /* 0x0A */
            opcode: "INC",
            un: "INC_R2",
            bytes: 1,
            oprand1: "R2"
        }, {
            /* 0x0B */
            opcode: "INC",
            un: "INC_R3",
            bytes: 1,
            oprand1: "R3"
        }, {
            /* 0x0C */
            opcode: "INC",
            un: "INC_R4",
            bytes: 1,
            oprand1: "R4"
        }, {
            /* 0x0D */
            opcode: "INC",
            un: "INC_R5",
            bytes: 1,
            oprand1: "R5"
        }, {
            /* 0x0E */
            opcode: "INC",
            un: "INC_R6",
            bytes: 1,
            oprand1: "R6"
        }, {
            /* 0x0F */
            opcode: "INC",
            un: "INC_R7",
            bytes: 1,
            oprand1: "R7"
        }, {
            /* 0x10 */
            opcode: "JBC",
            un: "JBC",
            bytes: 3,
            dasm: dasm_op_bit_rel
        }, {
            /* 0x11 */
            opcode: "ACALL",
            un: "ACALL_PAGE0",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x12 */
            opcode: "LCALL",
            un: "LCALL",
            bytes: 3,
            dasm: dasm_op_laddr
        }, {
            /* 0x13 */
            opcode: "RRC",
            un: "RRC",
            bytes: 1,
            oprand1: "A"
        }, {
            /* 0x14 */
            opcode: "DEC",
            un: "DEC_A",
            bytes: 1,
            oprand1: "A"
        }, {
            /* 0x15 */
            opcode: "DEC",
            un: "DEC_DIR",
            bytes: 2,
            dasm: dasm_op_dir
        }, {
            /* 0x16 */
            opcode: "DEC",
            un: "DEC_AT_R0",
            bytes: 1,
            oprand1: "@R0"
        }, {
            /* 0x17 */
            opcode: "DEC",
            un: "DEC_AT_R1",
            bytes: 1,
            oprand1: "@R1"
        }, {
            /* 0x18 */
            opcode: "DEC",
            un: "DEC_R0",
            bytes: 1,
            oprand1: "R0"
        }, {
            /* 0x19 */
            opcode: "DEC",
            un: "DEC_R1",
            bytes: 1,
            oprand1: "R1"
        }, {
            /* 0x1A */
            opcode: "DEC",
            un: "DEC_R2",
            bytes: 1,
            oprand1: "R2"
        }, {
            /* 0x1B */
            opcode: "DEC",
            un: "DEC_R3",
            bytes: 1,
            oprand1: "R3"
        }, {
            /* 0x1C */
            opcode: "DEC",
            un: "DEC_R4",
            bytes: 1,
            oprand1: "R4"
        }, {
            /* 0x1D */
            opcode: "DEC",
            un: "DEC_R5",
            bytes: 1,
            oprand1: "R5"
        }, {
            /* 0x1E */
            opcode: "DEC",
            un: "DEC_R6",
            bytes: 1,
            oprand1: "R6"
        }, {
            /* 0x1F */
            opcode: "DEC",
            un: "DEC_R7",
            bytes: 1,
            oprand1: "R7"
        }, {
            /* 0x20 */
            opcode: "JB",
            un: "JB",
            bytes: 3,
            dasm: dasm_op_bit_rel
        }, {
            /* 0x21 */
            opcode: "AJMP",
            un: "AJMP_PAGE1",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x22 */
            opcode: "RET",
            un: "RET",
            bytes: 1
        }, {
            /* 0x23 */
            opcode: "RL",
            un: "RL",
            bytes: 1,
            oprand1: "A"
        }, {
            /* 0x24 */
            opcode: "ADD",
            un: "ADD_IMM",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_imm
        }, {
            /* 0x25 */
            opcode: "ADD",
            un: "ADD_DIR",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_dir
        }, {
            /* 0x26 */
            opcode: "ADD",
            un: "ADD_AT_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R0"
        }, {
            /* 0x27 */
            opcode: "ADD",
            un: "ADD_AT_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R1"
        }, {
            /* 0x28 */
            opcode: "ADD",
            un: "ADD_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "R0"
        }, {
            /* 0x29 */
            opcode: "ADD",
            un: "ADD_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "R1"
        }, {
            /* 0x2A */
            opcode: "ADD",
            un: "ADD_R2",
            bytes: 1,
            oprand1: "A",
            oprand2: "R2"
        }, {
            /* 0x2B */
            opcode: "ADD",
            un: "ADD_R3",
            bytes: 1,
            oprand1: "A",
            oprand2: "R3"
        }, {
            /* 0x2C */
            opcode: "ADD",
            un: "ADD_R4",
            bytes: 1,
            oprand1: "A",
            oprand2: "R4"
        }, {
            /* 0x2D */
            opcode: "ADD",
            un: "ADD_R5",
            bytes: 1,
            oprand1: "A",
            oprand2: "R5"
        }, {
            /* 0x2E */
            opcode: "ADD",
            un: "ADD_R6",
            bytes: 1,
            oprand1: "A",
            oprand2: "R6"
        }, {
            /* 0x2F */
            opcode: "ADD",
            un: "ADD_R7",
            bytes: 1,
            oprand1: "A",
            oprand2: "R7"
        }, {
            /* 0x30 */
            opcode: "JNB",
            un: "JNB",
            bytes: 3,
            dasm: dasm_op_bit_rel
        }, {
            /* 0x31 */
            opcode: "ACALL",
            un: "ACALL_PAGE1",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x32 */
            opcode: "RETI",
            un: "RETI",
            bytes: 1
        }, {
            /* 0x33 */
            opcode: "RLC",
            un: "RLC",
            bytes: 1,
            oprand1: "A"
        }, {
            /* 0x34 */
            opcode: "ADDC",
            un: "ADDC_IMM",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_imm
        }, {
            /* 0x35 */
            opcode: "ADDC",
            un: "ADDC_DIR",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_dir
        }, {
            /* 0x36 */
            opcode: "ADDC",
            un: "ADDC_AT_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R0"
        }, {
            /* 0x37 */
            opcode: "ADDC",
            un: "ADDC_AT_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R1"
        }, {
            /* 0x38 */
            opcode: "ADDC",
            un: "ADDC_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "R0"
        }, {
            /* 0x39 */
            opcode: "ADDC",
            un: "ADDC_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "R1"
        }, {
            /* 0x3A */
            opcode: "ADDC",
            un: "ADDC_R2",
            bytes: 1,
            oprand1: "A",
            oprand2: "R2"
        }, {
            /* 0x3B */
            opcode: "ADDC",
            un: "ADDC_R3",
            bytes: 1,
            oprand1: "A",
            oprand2: "R3"
        }, {
            /* 0x3C */
            opcode: "ADDC",
            un: "ADDC_R4",
            bytes: 1,
            oprand1: "A",
            oprand2: "R4"
        }, {
            /* 0x3D */
            opcode: "ADDC",
            un: "ADDC_R5",
            bytes: 1,
            oprand1: "A",
            oprand2: "R5"
        }, {
            /* 0x3E */
            opcode: "ADDC",
            un: "ADDC_R6",
            bytes: 1,
            oprand1: "A",
            oprand2: "R6"
        }, {
            /* 0x3F */
            opcode: "ADDC",
            un: "ADDC_R7",
            bytes: 1,
            oprand1: "A",
            oprand2: "R7"
        }, {
            /* 0x40 */
            opcode: "JC",
            un: "JC",
            bytes: 2,
            dasm: dasm_op_rel
        }, {
            /* 0x41 */
            opcode: "AJMP",
            un: "AJMP_PAGE2",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x42 */
            opcode: "ORL",
            un: "ORL_DIR_A",
            bytes: 2,
            oprand2: "A",
            dasm: dasm_op_dir
        }, {
            /* 0x43 */
            opcode: "ORL",
            un: "ORL_DIR_IMM",
            bytes: 3,
            dasm: dasm_op_dir_imm
        }, {
            /* 0x44 */
            opcode: "ORL",
            un: "ORL_IMM",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_imm
        }, {
            /* 0x45 */
            opcode: "ORL",
            un: "ORL_DIR",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_dir
        }, {
            /* 0x46 */
            opcode: "ORL",
            un: "ORL_AT_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R0"
        }, {
            /* 0x47 */
            opcode: "ORL",
            un: "ORL_AT_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R1"
        }, {
            /* 0x48 */
            opcode: "ORL",
            un: "ORL_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "R0"
        }, {
            /* 0x49 */
            opcode: "ORL",
            un: "ORL_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "R1"
        }, {
            /* 0x4A */
            opcode: "ORL",
            un: "ORL_R2",
            bytes: 1,
            oprand1: "A",
            oprand2: "R2"
        }, {
            /* 0x4B */
            opcode: "ORL",
            un: "ORL_R3",
            bytes: 1,
            oprand1: "A",
            oprand2: "R3"
        }, {
            /* 0x4C */
            opcode: "ORL",
            un: "ORL_R4",
            bytes: 1,
            oprand1: "A",
            oprand2: "R4"
        }, {
            /* 0x4D */
            opcode: "ORL",
            un: "ORL_R5",
            bytes: 1,
            oprand1: "A",
            oprand2: "R5"
        }, {
            /* 0x4E */
            opcode: "ORL",
            un: "ORL_R6",
            bytes: 1,
            oprand1: "A",
            oprand2: "R6"
        }, {
            /* 0x4F */
            opcode: "ORL",
            un: "ORL_R7",
            bytes: 1,
            oprand1: "A",
            oprand2: "R7"
        }, {
            /* 0x50 */
            opcode: "JNC",
            un: "JNC",
            bytes: 2,
            dasm: dasm_op_rel
        }, {
            /* 0x51 */
            opcode: "ACALL",
            un: "ACALL_PAGE2",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x52 */
            opcode: "ANL",
            un: "ANL_DIR_A",
            bytes: 2,
            oprand2: "A",
            dasm: dasm_op_dir
        }, {
            /* 0x53 */
            opcode: "ANL",
            un: "ANL_DIR_IMM",
            bytes: 3,
            dasm: dasm_op_dir_imm
        }, {
            /* 0x54 */
            opcode: "ANL",
            un: "ANL_IMM",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_imm
        }, {
            /* 0x55 */
            opcode: "ANL",
            un: "ANL_DIR",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_dir
        }, {
            /* 0x56 */
            opcode: "ANL",
            un: "ANL_AT_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R0"
        }, {
            /* 0x57 */
            opcode: "ANL",
            un: "ANL_AT_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R1"
        }, {
            /* 0x58 */
            opcode: "ANL",
            un: "ANL_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "R0"
        }, {
            /* 0x59 */
            opcode: "ANL",
            un: "ANL_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "R1"
        }, {
            /* 0x5A */
            opcode: "ANL",
            un: "ANL_R2",
            bytes: 1,
            oprand1: "A",
            oprand2: "R2"
        }, {
            /* 0x5B */
            opcode: "ANL",
            un: "ANL_R3",
            bytes: 1,
            oprand1: "A",
            oprand2: "R3"
        }, {
            /* 0x5C */
            opcode: "ANL",
            un: "ANL_R4",
            bytes: 1,
            oprand1: "A",
            oprand2: "R4"
        }, {
            /* 0x5D */
            opcode: "ANL",
            un: "ANL_R5",
            bytes: 1,
            oprand1: "A",
            oprand2: "R5"
        }, {
            /* 0x5E */
            opcode: "ANL",
            un: "ANL_R6",
            bytes: 1,
            oprand1: "A",
            oprand2: "R6"
        }, {
            /* 0x5F */
            opcode: "ANL",
            un: "ANL_R7",
            bytes: 1,
            oprand1: "A",
            oprand2: "R7"
        }, {
            /* 0x60 */
            opcode: "JZ",
            un: "JZ",
            bytes: 2,
            dasm: dasm_op_rel
        }, {
            /* 0x61 */
            opcode: "AJMP",
            un: "AJMP_PAGE3",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x62 */
            opcode: "XRL",
            un: "XRL_DIR_A",
            bytes: 2,
            oprand2: "A",
            dasm: dasm_op_dir
        }, {
            /* 0x63 */
            opcode: "XRL",
            un: "XRL_DIR_IMM",
            bytes: 3,
            dasm: dasm_op_dir_imm
        }, {
            /* 0x64 */
            opcode: "XRL",
            un: "XRL_IMM",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_imm
        }, {
            /* 0x65 */
            opcode: "XRL",
            un: "XRL_DIR",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_dir
        }, {
            /* 0x66 */
            opcode: "XRL",
            un: "XRL_AT_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R0"
        }, {
            /* 0x67 */
            opcode: "XRL",
            un: "XRL_AT_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R1"
        }, {
            /* 0x68 */
            opcode: "XRL",
            un: "XRL_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "R0"
        }, {
            /* 0x69 */
            opcode: "XRL",
            un: "XRL_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "R1"
        }, {
            /* 0x6A */
            opcode: "XRL",
            un: "XRL_R2",
            bytes: 1,
            oprand1: "A",
            oprand2: "R2"
        }, {
            /* 0x6B */
            opcode: "XRL",
            un: "XRL_R3",
            bytes: 1,
            oprand1: "A",
            oprand2: "R3"
        }, {
            /* 0x6C */
            opcode: "XRL",
            un: "XRL_R4",
            bytes: 1,
            oprand1: "A",
            oprand2: "R4"
        }, {
            /* 0x6D */
            opcode: "XRL",
            un: "XRL_R5",
            bytes: 1,
            oprand1: "A",
            oprand2: "R5"
        }, {
            /* 0x6E */
            opcode: "XRL",
            un: "XRL_R6",
            bytes: 1,
            oprand1: "A",
            oprand2: "R6"
        }, {
            /* 0x6F */
            opcode: "XRL",
            un: "XRL_R7",
            bytes: 1,
            oprand1: "A",
            oprand2: "R7"
        }, {
            /* 0x70 */
            opcode: "JNZ",
            un: "JNZ",
            bytes: 2,
            dasm: dasm_op_rel
        }, {
            /* 0x71 */
            opcode: "ACALL",
            un: "ACALL_PAGE3",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x72 */
            opcode: "ORL",
            un: "ORL_C_BIT",
            bytes: 2,
            oprand1: "C",
            dasm: dasm_op_x_bit
        }, {
            /* 0x73 */
            opcode: "JMP",
            un: "JMP",
            bytes: 1,
            oprand1: "@A+DPTR"
        }, {
            /* 0x74 */
            opcode: "MOV",
            un: "MOV_A_IMM",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_imm
        }, {
            /* 0x75 */
            opcode: "MOV",
            un: "MOV_DIR_IMM",
            bytes: 3,
            dasm: dasm_op_dir_imm
        }, {
            /* 0x76 */
            opcode: "MOV",
            un: "MOV_AT_R0_IMM",
            bytes: 2,
            oprand1: "@R0",
            dasm: dasm_op_x_imm
        }, {
            /* 0x77 */
            opcode: "MOV",
            un: "MOV_AT_R1_IMM",
            bytes: 2,
            oprand1: "@R1",
            dasm: dasm_op_x_imm
        }, {
            /* 0x78 */
            opcode: "MOV",
            un: "MOV_R0_IMM",
            bytes: 2,
            oprand1: "R0",
            dasm: dasm_op_x_imm
        }, {
            /* 0x79 */
            opcode: "MOV",
            un: "MOV_R1_IMM",
            bytes: 2,
            oprand1: "R1",
            dasm: dasm_op_x_imm
        }, {
            /* 0x7A */
            opcode: "MOV",
            un: "MOV_R2_IMM",
            bytes: 2,
            oprand1: "R2",
            dasm: dasm_op_x_imm
        }, {
            /* 0x7B */
            opcode: "MOV",
            un: "MOV_R3_IMM",
            bytes: 2,
            oprand1: "R3",
            dasm: dasm_op_x_imm
        }, {
            /* 0x7C */
            opcode: "MOV",
            un: "MOV_R4_IMM",
            bytes: 2,
            oprand1: "R4",
            dasm: dasm_op_x_imm
        }, {
            /* 0x7D */
            opcode: "MOV",
            un: "MOV_R5_IMM",
            bytes: 2,
            oprand1: "R5",
            dasm: dasm_op_x_imm
        }, {
            /* 0x7E */
            opcode: "MOV",
            un: "MOV_R6_IMM",
            bytes: 2,
            oprand1: "R6",
            dasm: dasm_op_x_imm
        }, {
            /* 0x7F */
            opcode: "MOV",
            un: "MOV_R7_IMM",
            bytes: 2,
            oprand1: "R7",
            dasm: dasm_op_x_imm
        }, {
            /* 0x80 */
            opcode: "SJMP",
            un: "SJMP",
            bytes: 2,
            dasm: dasm_op_rel
        }, {
            /* 0x81 */
            opcode: "AJMP",
            un: "AJMP_PAGE4",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x82 */
            opcode: "ANL",
            un: "ANL_C_BIT",
            bytes: 2,
            oprand1: "C",
            dasm: dasm_op_x_bit
        }, {
            /* 0x83 */
            opcode: "MOVC",
            un: "MOVC_PC",
            bytes: 1,
            oprand1: "A",
            oprand2: "@A+PC"
        }, {
            /* 0x84 */
            opcode: "DIV",
            un: "DIV",
            bytes: 1,
            oprand1: "AB"
        }, {
            /* 0x85 */
            opcode: "MOV",
            un: "MOV_DIR_DIR",
            bytes: 3,
            dasm: dasm_op_dir_dir
        }, {
            /* 0x86 */
            opcode: "MOV",
            un: "MOV_DIR_AT_R0",
            bytes: 2,
            oprand2: "@R0",
            dasm: dasm_op_dir
        }, {
            /* 0x87 */
            opcode: "MOV",
            un: "MOV_DIR_AT_R1",
            bytes: 2,
            oprand2: "@R1",
            dasm: dasm_op_dir
        }, {
            /* 0x88 */
            opcode: "MOV",
            un: "MOV_DIR_R0",
            bytes: 2,
            oprand2: "R0",
            dasm: dasm_op_dir
        }, {
            /* 0x89 */
            opcode: "MOV",
            un: "MOV_DIR_R1",
            bytes: 2,
            oprand2: "R1",
            dasm: dasm_op_dir
        }, {
            /* 0x8A */
            opcode: "MOV",
            un: "MOV_DIR_R2",
            bytes: 2,
            oprand2: "R2",
            dasm: dasm_op_dir
        }, {
            /* 0x8B */
            opcode: "MOV",
            un: "MOV_DIR_R3",
            bytes: 2,
            oprand2: "R3",
            dasm: dasm_op_dir
        }, {
            /* 0x8C */
            opcode: "MOV",
            un: "MOV_DIR_R4",
            bytes: 2,
            oprand2: "R4",
            dasm: dasm_op_dir
        }, {
            /* 0x8D */
            opcode: "MOV",
            un: "MOV_DIR_R5",
            bytes: 2,
            oprand2: "R5",
            dasm: dasm_op_dir
        }, {
            /* 0x8E */
            opcode: "MOV",
            un: "MOV_DIR_R6",
            bytes: 2,
            oprand2: "R6",
            dasm: dasm_op_dir
        }, {
            /* 0x8F */
            opcode: "MOV",
            un: "MOV_DIR_R7",
            bytes: 2,
            oprand2: "R7",
            dasm: dasm_op_dir
        }, {
            /* 0x90 */
            opcode: "MOV",
            un: "MOV_DPTR_IMM2",
            bytes: 3,
            oprand1: "DPTR",
            dasm: dasm_op_x_imm2
        }, {
            /* 0x91 */
            opcode: "ACALL",
            un: "ACALL_PAGE4",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x92 */
            opcode: "MOV",
            un: "MOV_BIT_C",
            bytes: 2,
            oprand2: "C",
            dasm: dasm_op_bit
        }, {
            /* 0x93 */
            opcode: "MOVC",
            un: "MOVC_DPTR",
            bytes: 1,
            oprand1: "A",
            oprand2: "@A+DPTR"
        }, {
            /* 0x94 */
            opcode: "SUBB",
            un: "SUBB_IMM",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_imm
        }, {
            /* 0x95 */
            opcode: "SUBB",
            un: "ASUBB_DIR",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_dir
        }, {
            /* 0x96 */
            opcode: "SUBB",
            un: "SUBB_AT_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R0"
        }, {
            /* 0x97 */
            opcode: "SUBB",
            un: "SUBB_AT_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R1"
        }, {
            /* 0x98 */
            opcode: "SUBB",
            un: "SUBB_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "R0"
        }, {
            /* 0x99 */
            opcode: "SUBB",
            un: "SUBB_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "R1"
        }, {
            /* 0x9A */
            opcode: "SUBB",
            un: "SUBB_R2",
            bytes: 1,
            oprand1: "A",
            oprand2: "R2"
        }, {
            /* 0x9B */
            opcode: "SUBB",
            un: "SUBB_R3",
            bytes: 1,
            oprand1: "A",
            oprand2: "R3"
        }, {
            /* 0x9C */
            opcode: "SUBB",
            un: "SUBB_R4",
            bytes: 1,
            oprand1: "A",
            oprand2: "R4"
        }, {
            /* 0x9D */
            opcode: "SUBB",
            un: "SUBB_R5",
            bytes: 1,
            oprand1: "A",
            oprand2: "R5"
        }, {
            /* 0x9E */
            opcode: "SUBB",
            un: "SUBB_R6",
            bytes: 1,
            oprand1: "A",
            oprand2: "R6"
        }, {
            /* 0x9F */
            opcode: "SUBB",
            un: "SUBB_R7",
            bytes: 1,
            oprand1: "A",
            oprand2: "R7"
        }, {
            /* 0xA0 */
            opcode: "ORL",
            un: "ORL_C_NBIT",
            bytes: 2,
            oprand1: "C",
            dasm: dasm_op_x_nbit
        }, {
            /* 0xA1 */
            opcode: "AJMP",
            un: "AJMP_PAGE5",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xA2 */
            opcode: "MOV",
            un: "MOV_C_BIT",
            bytes: 2,
            oprand1: "C",
            dasm: dasm_op_x_bit
        }, {
            /* 0xA3 */
            opcode: "INC",
            un: "INC_DPTR",
            bytes: 1,
            oprand1: "DPTR"
        }, {
            /* 0xA4 */
            opcode: "MUL",
            un: "MUL",
            bytes: 1,
            oprand1: "AB"
        }, {
            /* 0xA5 */
            opcode: "<UNKNOWN>",
            un: "<UNKNOWN>",
            bytes: 1
        }, {
            /* 0xA6 */
            opcode: "MOV",
            un: "MOV_AT_R0_DIR",
            bytes: 2,
            oprand1: "@R0",
            dasm: dasm_op_x_dir
        }, {
            /* 0xA7 */
            opcode: "MOV",
            un: "MOV_AT_R1_DIR",
            bytes: 2,
            oprand1: "@R1",
            dasm: dasm_op_x_dir
        }, {
            /* 0xA8 */
            opcode: "MOV",
            un: "MOV_R0_DIR",
            bytes: 2,
            oprand1: "R0",
            dasm: dasm_op_x_dir
        }, {
            /* 0xA9 */
            opcode: "MOV",
            un: "MOV_R1_DIR",
            bytes: 2,
            oprand1: "R1",
            dasm: dasm_op_x_dir
        }, {
            /* 0xAA */
            opcode: "MOV",
            un: "MOV_R2_DIR",
            bytes: 2,
            oprand1: "R2",
            dasm: dasm_op_x_dir
        }, {
            /* 0xAB */
            opcode: "MOV",
            un: "MOV_R3_DIR",
            bytes: 2,
            oprand1: "R3",
            dasm: dasm_op_x_dir
        }, {
            /* 0xAC */
            opcode: "MOV",
            un: "MOV_R4_DIR",
            bytes: 2,
            oprand1: "R4",
            dasm: dasm_op_x_dir
        }, {
            /* 0xAD */
            opcode: "MOV",
            un: "MOV_R5_DIR",
            bytes: 2,
            oprand1: "R5",
            dasm: dasm_op_x_dir
        }, {
            /* 0xAE */
            opcode: "MOV",
            un: "MOV_R6_DIR",
            bytes: 2,
            oprand1: "R6",
            dasm: dasm_op_x_dir
        }, {
            /* 0xAF */
            opcode: "MOV",
            un: "MOV_R7_DIR",
            bytes: 2,
            oprand1: "R7",
            dasm: dasm_op_x_dir
        }, {
            /* 0xB0 */
            opcode: "ANL",
            un: "ANL_C_NBIT",
            bytes: 2,
            oprand1: "C",
            dasm: dasm_op_x_nbit
        }, {
            /* 0xB1 */
            opcode: "ACALL",
            un: "ACALL_PAGE5",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xB2 */
            opcode: "CPL",
            un: "CPL_BIT",
            bytes: 2,
            dasm: dasm_op_bit
        }, {
            /* 0xB3 */
            opcode: "CPL",
            un: "CPL_C",
            bytes: 1,
            oprand1: "C"
        }, {
            /* 0xB4 */
            opcode: "CJNE",
            un: "CJNE_A_IMM",
            bytes: 3,
            oprand1: "A",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xB5 */
            opcode: "CJNE",
            un: "CJNE_A_DIR",
            bytes: 3,
            oprand1: "A",
            dasm: dasm_op_x_dir_rel
        }, {
            /* 0xB6 */
            opcode: "CJNE",
            un: "CJNE_AT_R0_IMM",
            bytes: 3,
            oprand1: "@R0",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xB7 */
            opcode: "CJNE",
            un: "CJNE_AT_R1_IMM",
            bytes: 3,
            oprand1: "@R1",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xB8 */
            opcode: "CJNE",
            un: "CJNE_R0_IMM",
            bytes: 3,
            oprand1: "R0",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xB9 */
            opcode: "CJNE",
            un: "CJNE_R1_IMM",
            bytes: 3,
            oprand1: "R1",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xBA */
            opcode: "CJNE",
            un: "CJNE_R2_IMM",
            bytes: 3,
            oprand1: "R2",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xBB */
            opcode: "CJNE",
            un: "CJNE_R3_IMM",
            bytes: 3,
            oprand1: "R3",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xBC */
            opcode: "CJNE",
            un: "CJNE_R4_IMM",
            bytes: 3,
            oprand1: "R4",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xBD */
            opcode: "CJNE",
            un: "CJNE_R5_IMM",
            bytes: 3,
            oprand1: "R5",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xBE */
            opcode: "CJNE",
            un: "CJNE_R6_IMM",
            bytes: 3,
            oprand1: "R6",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xBF */
            opcode: "CJNE",
            un: "CJNE_R7_IMM",
            bytes: 3,
            oprand1: "R7",
            dasm: dasm_op_x_imm_rel
        }, {
            /* 0xC0 */
            opcode: "PUSH",
            un: "PUSH",
            bytes: 2,
            dasm: dasm_op_dir
        }, {
            /* 0xC1 */
            opcode: "AJMP",
            un: "AJMP_PAGE6",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xC2 */
            opcode: "CLR",
            un: "CLR_BIT",
            bytes: 2,
            dasm: dasm_op_bit
        }, {
            /* 0xC3 */
            opcode: "CLR",
            un: "CLR_C",
            bytes: 1,
            oprand1: "C"
        }, {
            /* 0xC4 */
            opcode: "SWAP",
            un: "SWAP",
            bytes: 1,
            oprand1: "A"
        }, {
            /* 0xC5 */
            opcode: "XCH",
            un: "XCH_DIR",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_dir
        }, {
            /* 0xC6 */
            opcode: "XCH",
            un: "XCH_AT_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R0"
        }, {
            /* 0xC7 */
            opcode: "XCH",
            un: "XCH_AT_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R1"
        }, {
            /* 0xC8 */
            opcode: "XCH",
            un: "XCH_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "R0"
        }, {
            /* 0xC9 */
            opcode: "XCH",
            un: "XCH_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "R1"
        }, {
            /* 0xCA */
            opcode: "XCH",
            un: "XCH_R2",
            bytes: 1,
            oprand1: "A",
            oprand2: "R2"
        }, {
            /* 0xCB */
            opcode: "XCH",
            un: "XCH_R3",
            bytes: 1,
            oprand1: "A",
            oprand2: "R3"
        }, {
            /* 0xCC */
            opcode: "XCH",
            un: "XCH_R4",
            bytes: 1,
            oprand1: "A",
            oprand2: "R4"
        }, {
            /* 0xCD */
            opcode: "XCH",
            un: "XCH_R5",
            bytes: 1,
            oprand1: "A",
            oprand2: "R5"
        }, {
            /* 0xCE */
            opcode: "XCH",
            un: "XCH_R6",
            bytes: 1,
            oprand1: "A",
            oprand2: "R6"
        }, {
            /* 0xCF */
            opcode: "XCH",
            un: "XCH_R7",
            bytes: 1,
            oprand1: "A",
            oprand2: "R7"
        }, {
            /* 0xD0 */
            opcode: "POP",
            un: "POP",
            bytes: 2,
            dasm: dasm_op_dir
        }, {
            /* 0xD1 */
            opcode: "ACALL",
            un: "ACALL_PAGE6",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xD2 */
            opcode: "SETB",
            un: "SETB_BIT",
            bytes: 2,
            dasm: dasm_op_bit
        }, {
            /* 0xD3 */
            opcode: "SETB",
            un: "SETB_C",
            bytes: 1,
            oprand1: "C"
        }, {
            /* 0xD4 */
            opcode: "DA",
            un: "DA",
            bytes: 1,
            oprand1: "A"
        }, {
            /* 0xD5 */
            opcode: "DJNZ",
            un: "DJNZ_DIR",
            bytes: 3,
            dasm: dasm_op_dir_rel
        }, {
            /* 0xD6 */
            opcode: "XCHD",
            un: "XCHD_AT_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R0"
        }, {
            /* 0xD7 */
            opcode: "XCHD",
            un: "XCHD_AT_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R1"
        }, {
            /* 0xD8 */
            opcode: "DJNZ",
            un: "DJNZ_R0",
            bytes: 2,
            oprand1: "R0",
            dasm: dasm_op_x_rel
        }, {
            /* 0xD9 */
            opcode: "DJNZ",
            un: "DJNZ_R1",
            bytes: 2,
            oprand1: "R1",
            dasm: dasm_op_x_rel
        }, {
            /* 0xDA */
            opcode: "DJNZ",
            un: "DJNZ_R2",
            bytes: 2,
            oprand1: "R2",
            dasm: dasm_op_x_rel
        }, {
            /* 0xDB */
            opcode: "DJNZ",
            un: "DJNZ_R3",
            bytes: 2,
            oprand1: "R3",
            dasm: dasm_op_x_rel
        }, {
            /* 0xDC */
            opcode: "DJNZ",
            un: "DJNZ_R4",
            bytes: 2,
            oprand1: "R4",
            dasm: dasm_op_x_rel
        }, {
            /* 0xDD */
            opcode: "DJNZ",
            un: "DJNZ_R5",
            bytes: 2,
            oprand1: "R5",
            dasm: dasm_op_x_rel
        }, {
            /* 0xDE */
            opcode: "DJNZ",
            un: "DJNZ_R6",
            bytes: 2,
            oprand1: "R6",
            dasm: dasm_op_x_rel
        }, {
            /* 0xDF */
            opcode: "DJNZ",
            un: "DJNZ_R7",
            bytes: 2,
            oprand1: "R7",
            dasm: dasm_op_x_rel
        }, {
            /* 0xE0 */
            opcode: "MOVX",
            un: "MOVX_A_AT_DPTR",
            bytes: 1,
            oprand1: "A",
            oprand2: "@DPTR"
        }, {
            /* 0xE1 */
            opcode: "AJMP",
            un: "AJMP_PAGE7",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xE2 */
            opcode: "MOVX",
            un: "MOVX_A_AT_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R0"
        }, {
            /* 0xE3 */
            opcode: "MOVX",
            un: "MOVX_A_AT_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R1"
        }, {
            /* 0xE4 */
            opcode: "CLR",
            un: "CLR_A",
            bytes: 1,
            oprand1: "A"
        }, {
            /* 0xE5 */
            opcode: "MOV",
            un: "MOV_A_DIR",
            bytes: 2,
            oprand1: "A",
            dasm: dasm_op_x_dir
        }, {
            /* 0xE6 */
            opcode: "MOV",
            un: "MOV_A_AT_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R0"
        }, {
            /* 0xE7 */
            opcode: "MOV",
            un: "MOV_A_AT_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "@R1"
        }, {
            /* 0xE8 */
            opcode: "MOV",
            un: "MOV_A_R0",
            bytes: 1,
            oprand1: "A",
            oprand2: "R0"
        }, {
            /* 0xE9 */
            opcode: "MOV",
            un: "MOV_A_R1",
            bytes: 1,
            oprand1: "A",
            oprand2: "R1"
        }, {
            /* 0xEA */
            opcode: "MOV",
            un: "MOV_A_R2",
            bytes: 1,
            oprand1: "A",
            oprand2: "R2"
        }, {
            /* 0xEB */
            opcode: "MOV",
            un: "MOV_A_R3",
            bytes: 1,
            oprand1: "A",
            oprand2: "R3"
        }, {
            /* 0xEC */
            opcode: "MOV",
            un: "MOV_A_R4",
            bytes: 1,
            oprand1: "A",
            oprand2: "R4"
        }, {
            /* 0xED */
            opcode: "MOV",
            un: "MOV_A_R5",
            bytes: 1,
            oprand1: "A",
            oprand2: "R5"
        }, {
            /* 0xEE */
            opcode: "MOV",
            un: "MOV_A_R6",
            bytes: 1,
            oprand1: "A",
            oprand2: "R6"
        }, {
            /* 0xEF */
            opcode: "MOV",
            un: "MOV_A_R7",
            bytes: 1,
            oprand1: "A",
            oprand2: "R7"
        }, {
            /* 0xF0 */
            opcode: "MOVX",
            un: "MOVX_AT_DPTR_A",
            bytes: 1,
            oprand1: "@DPTR",
            oprand2: "A"
        }, {
            /* 0xF1 */
            opcode: "ACALL",
            un: "ACALL_PAGE7",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xF2 */
            opcode: "MOVX",
            un: "MOVX_AT_R0_A",
            bytes: 1,
            oprand1: "@R0",
            oprand2: "A"
        }, {
            /* 0xF3 */
            opcode: "MOVX",
            un: "MOVX_AT_R1_A",
            bytes: 1,
            oprand1: "@R1",
            oprand2: "A"
        }, {
            /* 0xF4 */
            opcode: "CPL",
            un: "CPL_A",
            bytes: 1,
            oprand1: "A"
        }, {
            /* 0xF5 */
            opcode: "MOV",
            un: "MOV_DIR_A",
            bytes: 2,
            oprand2: "A",
            dasm: dasm_op_dir
        }, {
            /* 0xF6 */
            opcode: "MOV",
            un: "MOV_AT_R0_A",
            bytes: 1,
            oprand1: "@R0",
            oprand2: "A"
        }, {
            /* 0xF7 */
            opcode: "MOV",
            un: "MOV_AT_R1_A",
            bytes: 1,
            oprand1: "@R1",
            oprand2: "A"
        }, {
            /* 0xF8 */
            opcode: "MOV",
            un: "MOV_R0_A",
            bytes: 1,
            oprand1: "R0",
            oprand2: "A"
        }, {
            /* 0xF9 */
            opcode: "MOV",
            un: "MOV_R1_A",
            bytes: 1,
            oprand1: "R1",
            oprand2: "A"
        }, {
            /* 0xFA */
            opcode: "MOV",
            un: "MOV_R2_A",
            bytes: 1,
            oprand1: "R2",
            oprand2: "A"
        }, {
            /* 0xFB */
            opcode: "MOV",
            un: "MOV_R3_A",
            bytes: 1,
            oprand1: "R3",
            oprand2: "A"
        }, {
            /* 0xFC */
            opcode: "MOV",
            un: "MOV_R4_A",
            bytes: 1,
            oprand1: "R4",
            oprand2: "A"
        }, {
            /* 0xFD */
            opcode: "MOV",
            un: "MOV_R5_A",
            bytes: 1,
            oprand1: "R5",
            oprand2: "A"
        }, {
            /* 0xFE */
            opcode: "MOV",
            un: "MOV_R6_A",
            bytes: 1,
            oprand1: "R6",
            oprand2: "A"
        }, {
            /* 0xFF */
            opcode: "MOV",
            un: "MOV_R7_A",
            bytes: 1,
            oprand1: "R7",
            oprand2: "A"
        }];
    }

    /*= 初始化 =*/
    set_globals();
    reg_events();
})();