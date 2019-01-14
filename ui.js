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

            const data_lines = lines.filter(v => v.type == 0).sort((a, b) => a.address - b.address);
            const byte_arr = create_byte_array(data_lines);
            render_bin_view(byte_arr);

            const asm_list = create_asm_list(byte_arr);
            render_asm_view(asm_list);
        }
        r.readAsText(f);
    }

    function parse_hex(t) {
        const lines = t.split("\n").map((v, i) => {
            return parse_hex_line(v.trim(), i + 1);
        });

        for (const cur_ln of lines) {
            for (const ln of lines) {
                if (cur_ln.number !== ln.number &&
                    cur_ln.type === ln.type &&
                    cur_ln.address >= ln.address &&
                    cur_ln.address < ln.address + ln.count) {
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
            if (!byte_arr[ai].is_gap) td_data.innerText = format_hex(byte_arr[ai].data, 2);
            tr_cur.appendChild(td_data);
        }

        table.appendChild(tbody);
        el_bv.appendChild(table);
    }

    function render_asm_view(asm_list) {}

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
            } else {
                let ci = {
                    offset: p
                };
                const md = opcode_metadata[cb.data];
                ci.opcode = md.opcode;
                ci.bytes = [cb];
                for (let i = 1; i <= md.bytes; i++) ci.bytes.push(byte_arr[p + i]);
                if (md.oprand1) ci.oprand1 = md.oprand1;
                if (md.oprand2) ci.oprand2 = md.oprand2;
                if (md.dasm) md.dasm(ci);
                inst_list.push(ci);
                index_list[p] = ci;
                p += ci.bytes.length - 1;
            }
        }

        return {
            inst_list,
            index_list
        };
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

    function format_bin_table_header(start, end) {
        return format_hex(start, 4) + " - " + format_hex(end - 1, 4);
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
            raw_data: rel_data,
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

    function create_imm_oprand(data) {
        return {
            type: "IMM",
            data,
            str: format_imm_data(data)
        };
    }

    function dasm_op_abs(ci) {
        /* a10 a9 a8 0 0001   a7 a6 a5 a4 a3 a2 a1 a0 */
        ci.oprand1 = create_addr_oprand(((ci.bytes[0].data & 0xE0) << 3) | ci.bytes[1].data);
    }

    function dasm_laddr(ci) {
        ci.oprand1 = create_addr_oprand((ci.bytes[1].data << 8) | ci.bytes[2].data);
    }

    function dasm_op_dir(ci) {
        ci.oprand1 = create_dir_oprand(ci.bytes[1].data);
    }

    function dasm_op_x_dir(ci) {
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
            dasm: dasm_laddr
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
            dasm: dasm_laddr
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
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x43 */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x44 */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x45 */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x46 */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x47 */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x48 */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x49 */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x4A */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x4B */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x4C */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x4D */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x4E */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x4F */
            opcode: "ORL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
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
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x53 */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x54 */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x55 */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x56 */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x57 */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x58 */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x59 */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x5A */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x5B */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x5C */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x5D */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x5E */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x5F */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
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
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x63 */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x64 */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x65 */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x66 */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x67 */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x68 */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x69 */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x6A */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x6B */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x6C */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x6D */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x6E */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
        }, {
            /* 0x6F */
            opcode: "XRL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xrl
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
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0x73 */
            opcode: "JMP",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_jmp
        }, {
            /* 0x74 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x75 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x76 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x77 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x78 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x79 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x7A */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x7B */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x7C */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x7D */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x7E */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x7F */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
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
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0x83 */
            opcode: "MOVC",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_movc
        }, {
            /* 0x84 */
            opcode: "DIV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_div
        }, {
            /* 0x85 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x86 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x87 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x88 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x89 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x8A */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x8B */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x8C */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x8D */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x8E */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x8F */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x90 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x91 */
            opcode: "ACALL",
            un: "ACALL_PAGE4",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0x92 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0x93 */
            opcode: "MOVC",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_movc
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
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_orl
        }, {
            /* 0xA1 */
            opcode: "AJMP",
            un: "AJMP_PAGE5",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xA2 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xA3 */
            opcode: "INC",
            un: "INC_DPTR",
            bytes: 1,
            oprand1: "DPTR"
        }, {
            /* 0xA4 */
            opcode: "MUL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mul
        }, {
            /* 0xA5 */
            opcode: "UNKNOWN",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_unknown
        }, {
            /* 0xA6 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xA7 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xA8 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xA9 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xAA */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xAB */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xAC */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xAD */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xAE */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xAF */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xB0 */
            opcode: "ANL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_anl
        }, {
            /* 0xB1 */
            opcode: "ACALL",
            un: "ACALL_PAGE5",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xB2 */
            opcode: "CPL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cpl
        }, {
            /* 0xB3 */
            opcode: "CPL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cpl
        }, {
            /* 0xB4 */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xB5 */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xB6 */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xB7 */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xB8 */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xB9 */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xBA */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xBB */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xBC */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xBD */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xBE */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xBF */
            opcode: "CJNE",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cjne
        }, {
            /* 0xC0 */
            opcode: "PUSH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_push
        }, {
            /* 0xC1 */
            opcode: "AJMP",
            un: "AJMP_PAGE6",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xC2 */
            opcode: "CLR",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_clr
        }, {
            /* 0xC3 */
            opcode: "CLR",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_clr
        }, {
            /* 0xC4 */
            opcode: "SWAP",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_swap
        }, {
            /* 0xC5 */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xC6 */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xC7 */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xC8 */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xC9 */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xCA */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xCB */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xCC */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xCD */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xCE */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xCF */
            opcode: "XCH",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xch
        }, {
            /* 0xD0 */
            opcode: "POP",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_pop
        }, {
            /* 0xD1 */
            opcode: "ACALL",
            un: "ACALL_PAGE6",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xD2 */
            opcode: "SETB",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_setb
        }, {
            /* 0xD3 */
            opcode: "SETB",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_setb
        }, {
            /* 0xD4 */
            opcode: "DA",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_da
        }, {
            /* 0xD5 */
            opcode: "DJNZ",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_djnz
        }, {
            /* 0xD6 */
            opcode: "XCHD",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xchd
        }, {
            /* 0xD7 */
            opcode: "XCHD",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_xchd
        }, {
            /* 0xD8 */
            opcode: "DJNZ",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_djnz
        }, {
            /* 0xD9 */
            opcode: "DJNZ",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_djnz
        }, {
            /* 0xDA */
            opcode: "DJNZ",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_djnz
        }, {
            /* 0xDB */
            opcode: "DJNZ",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_djnz
        }, {
            /* 0xDC */
            opcode: "DJNZ",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_djnz
        }, {
            /* 0xDD */
            opcode: "DJNZ",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_djnz
        }, {
            /* 0xDE */
            opcode: "DJNZ",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_djnz
        }, {
            /* 0xDF */
            opcode: "DJNZ",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_djnz
        }, {
            /* 0xE0 */
            opcode: "MOVX",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_movx
        }, {
            /* 0xE1 */
            opcode: "AJMP",
            un: "AJMP_PAGE7",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xE2 */
            opcode: "MOVX",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_movx
        }, {
            /* 0xE3 */
            opcode: "MOVX",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_movx
        }, {
            /* 0xE4 */
            opcode: "CLR",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_clr
        }, {
            /* 0xE5 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xE6 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xE7 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xE8 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xE9 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xEA */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xEB */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xEC */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xED */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xEE */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xEF */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xF0 */
            opcode: "MOVX",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_movx
        }, {
            /* 0xF1 */
            opcode: "ACALL",
            un: "ACALL_PAGE7",
            bytes: 2,
            dasm: dasm_op_abs
        }, {
            /* 0xF2 */
            opcode: "MOVX",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_movx
        }, {
            /* 0xF3 */
            opcode: "MOVX",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_movx
        }, {
            /* 0xF4 */
            opcode: "CPL",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_cpl
        }, {
            /* 0xF5 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xF6 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xF7 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xF8 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xF9 */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xFA */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xFB */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xFC */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xFD */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xFE */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }, {
            /* 0xFF */
            opcode: "MOV",
            un: "",
            bytes: 0,
            oprand1: "",
            oprand2: "",
            dasm: dasm_mov
        }];
    }

    /*= 初始化 =*/
    set_globals();
    reg_events();
})();