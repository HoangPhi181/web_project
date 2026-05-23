// backend/utils/validators.js

const { ValidationError } = require('./errors');

// ─── Validate SL/TP theo side và giá mở lệnh ────
function checkSLTP(side, openPrice, sl, tp) {
    const errors = [];
    const open   = parseFloat(openPrice);

    if (sl !== null && sl !== undefined && sl !== '') {
        const v = parseFloat(sl);
        if (isNaN(v) || v <= 0) {
            errors.push({ field: 'stop_loss', message: 'Stop Loss phải là số dương' });
        } else if (side === 'BUY' && v >= open) {
            errors.push({ field: 'stop_loss', message: `Stop Loss lệnh MUA phải nhỏ hơn giá mở lệnh (${open})` });
        } else if (side === 'SELL' && v <= open) {
            errors.push({ field: 'stop_loss', message: `Stop Loss lệnh BÁN phải lớn hơn giá mở lệnh (${open})` });
        }
    }

    if (tp !== null && tp !== undefined && tp !== '') {
        const v = parseFloat(tp);
        if (isNaN(v) || v <= 0) {
            errors.push({ field: 'take_profit', message: 'Take Profit phải là số dương' });
        } else if (side === 'BUY' && v <= open) {
            errors.push({ field: 'take_profit', message: `Take Profit lệnh MUA phải lớn hơn giá mở lệnh (${open})` });
        } else if (side === 'SELL' && v >= open) {
            errors.push({ field: 'take_profit', message: `Take Profit lệnh BÁN phải nhỏ hơn giá mở lệnh (${open})` });
        }
    }

    if (sl && tp) {
        const sv = parseFloat(sl), tv = parseFloat(tp);
        if (!isNaN(sv) && !isNaN(tv) && sv === tv)
            errors.push({ field: 'stop_loss', message: 'Stop Loss và Take Profit không được bằng nhau' });
    }

    return errors;
}

// ─── Validate tạo lệnh ───
function validateOrderCreate(body, currentPrice) {
    const errors = {};

    if (!body.product_id || !Number.isInteger(Number(body.product_id)) || Number(body.product_id) <= 0)
        errors.product_id = 'ID sản phẩm không hợp lệ';

    const side = body.side?.toUpperCase();
    if (!['BUY', 'SELL'].includes(side))
        errors.side = 'Side phải là BUY hoặc SELL';

    if (!body.volume || isNaN(body.volume)) {
        errors.volume = 'Volume phải là số hợp lệ';
    } else {
        const vol = parseFloat(body.volume);
        if (vol <= 0)   errors.volume = 'Volume phải lớn hơn 0';
        if (vol > 1000) errors.volume = 'Volume không được vượt quá 1000';
    }

    const hasSL = body.stop_loss   != null && body.stop_loss   !== '';
    const hasTP = body.take_profit != null && body.take_profit !== '';

    // Nếu có SL hoặc TP thì bắt buộc phải có currentPrice để validate
    if (hasSL || hasTP) {
        if (!currentPrice) {
            errors.price = 'Không lấy được giá hiện tại để kiểm tra SL/TP';
        } else if (side && ['BUY', 'SELL'].includes(side)) {
            const slErrs = checkSLTP(
                side,
                currentPrice,
                hasSL ? body.stop_loss   : null,
                hasTP ? body.take_profit : null
            );
            slErrs.forEach(e => { errors[e.field] = e.message; });
        }
    }

    if (Object.keys(errors).length > 0)
        throw new ValidationError('Validation thất bại', errors);

    return {
        product_id:  parseInt(body.product_id),
        side,
        volume:      parseFloat(body.volume).toFixed(8),
        stop_loss:   hasSL ? parseFloat(body.stop_loss).toFixed(8)   : null,
        take_profit: hasTP ? parseFloat(body.take_profit).toFixed(8) : null,
    };
}

// ─── Validate đóng lệnh ────
function validateCloseOrder(body) {
    const errors = {};
    if (!body.close_price || isNaN(body.close_price))
        errors.close_price = 'Giá đóng lệnh phải là số hợp lệ';
    else if (parseFloat(body.close_price) <= 0)
        errors.close_price = 'Giá đóng lệnh phải lớn hơn 0';
    if (Object.keys(errors).length > 0)
        throw new ValidationError('Validation thất bại', errors);
    return { close_price: parseFloat(body.close_price).toFixed(8) };
}

// ─── Validate phân trang ────
function validatePagination(query) {
    let limit = parseInt(query.limit) || 20;
    let page  = parseInt(query.page)  || 1;
    if (limit < 1)   limit = 20;
    if (limit > 100) limit = 100;
    if (page  < 1)   page  = 1;
    return { limit, page, offset: (page - 1) * limit };
}

// ─── Validate đăng ký ────
function validateRegister(body) {
    const errors = {};
    if (!body.username || body.username.length < 3 || body.username.length > 50)
        errors.username = 'Tên đăng nhập phải từ 3-50 ký tự';
    else if (!/^[a-zA-Z0-9_]+$/.test(body.username))
        errors.username = 'Tên đăng nhập chỉ được chứa chữ, số và dấu gạch dưới';
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
        errors.email = 'Email không hợp lệ';
    if (!body.password || body.password.length < 8)
        errors.password = 'Mật khẩu phải ít nhất 8 ký tự';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(body.password))
        errors.password = 'Mật khẩu phải có chữ thường, chữ hoa và số';
    if (Object.keys(errors).length > 0)
        throw new ValidationError('Validation thất bại', errors);
    return {
        username: body.username.trim(),
        email:    body.email.trim().toLowerCase(),
        password: body.password,
    };
}

// ─── Validate đăng nhập ───
function validateLogin(body) {
    const errors = {};
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
        errors.email = 'Email không hợp lệ';
    if (!body.password || body.password.length < 6)
        errors.password = 'Mật khẩu phải ít nhất 6 ký tự';
    if (Object.keys(errors).length > 0)
        throw new ValidationError('Validation thất bại', errors);
    return {
        email:    body.email.trim().toLowerCase(),
        password: body.password,
    };
}

module.exports = {
    checkSLTP,
    validateOrderCreate,
    validateCloseOrder,
    validatePagination,
    validateRegister,
    validateLogin,
};
