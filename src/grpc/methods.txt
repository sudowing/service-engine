export const grpcMethodGenerator = ({logger}) => ({
    sayHello: ({request}, callback) => {
        logger.debug('some_grpc_call', {request})
        callback(null, {message: 'Hello ' + request.name});
        // callback(new Error('some error'));
    },
})
