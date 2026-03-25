// import { WebSocketGateway, WebSocketServer, SubscribeMessage, } from '@nestjs/websockets';
// import { VideoService } from './video.service';

// @WebSocketGateway()
// export class VideoGateway {

//     constructor(private mediaService: VideoService) { }

//     @WebSocketServer()
//     server: Server

//     @SubscribeMessage('joinRoom')
//     async joinRoom(client, data) {

//         const routerRtpCapabilities = this.mediaService.router.rtpCapabilities

//         client.emit('routerCapabilities', routerRtpCapabilities)

//     }

// }