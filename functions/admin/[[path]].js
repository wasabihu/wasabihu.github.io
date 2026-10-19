import {handleApi} from '../../cloud/server/api.mjs';
export const onRequest = ({request,env}) => handleApi(request,env);
