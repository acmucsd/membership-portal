import { createParamDecorator } from 'routing-controllers';
import { request } from '../requestParams/index'

export function Response(options?: { required?: boolean }) {
    return createParamDecorator({
        required: options && options.required ? true : false,
        value: action => {
            const info:request = {
                param:action.request.param,
                body:action.request.body,
                queryParam:action.request.queryParams,
                query:action.request.body,
                authenticatedUser:action.request.user,
                requestTrace:action.request.trace,
            }
            return info;
        },
    });
}