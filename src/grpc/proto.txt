export const grpcSchema = ({AppShortName}: any) => {

    const protoString = `

        syntax = "proto3";

        package service;

        service ${AppShortName} {
            rpc SayHello (HelloRequest) returns (HelloReply) {}
        }
        message HelloRequest {
            required string name = 1;
        }

        message HelloReply {
            required string message = 1;
        }

    `;

    return {
        protoString,
    };
};