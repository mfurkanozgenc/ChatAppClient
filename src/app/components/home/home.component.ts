import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { UserModel } from '../../models/userModel';
import { ChatModel } from '../../models/chatModel';
import { FormsModule } from '@angular/forms';
import * as signalR from '@microsoft/signalr'
import { FilterPipe } from '../../pipes/filter.pipe';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule,CommonModule,FilterPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})

export class HomeComponent {
  users : UserModel[] = [];
  chats : ChatModel[] = [];
  selectedUserId: string = "";
  selectedUser : UserModel = new UserModel();
  user = new UserModel();
  search : string = "";
  hub : signalR.HubConnection | undefined;
  message : string = '';
  constructor(
    private http : HttpClient
  ){
    this.user = JSON.parse(localStorage.getItem("acessToken") ?? "");
    this.getUsers();

    this.hub = new signalR.HubConnectionBuilder().withUrl("https://localhost:7056/chat-hub").build();

    this.hub.start().then(() =>{
      this.hub?.invoke("Connect",this.user.id);

      this.hub?.on("Users",(res : UserModel) => {
        this.users.find(p => p.id == res.id)!.status = res.status;
        this.users.find(p => p.id == res.id)!.lastActiveDate = res.lastActiveDate;
      })

      this.hub?.on("Messages",(res : ChatModel) =>{
        if(this.selectedUserId === res.userId){
          this.chats.push(res);
        }
      })
      this.hub?.on("ChangeMessages",(res : ChatModel[]) =>{
        var filteredMessages = res.filter(c => c.userId == this.user.id && c.toUserId === this.selectedUser.id);
        this.chats = filteredMessages;
      })

      this.hub?.on("AllNotReadChats",(res : ChatModel[]) =>{
        console.log("TÜM OKUNMAYAN MESAJLAR",res);
        this.users.forEach(user => {
          var userNewMessagess = res.filter(m => m.userId === user.id);
          user.newMessageCount = userNewMessagess.length;
        });

      })
    })
  }
  getUsers(){
    this.http.get<UserModel[]>("https://localhost:7056/api/Chats/GetUsers").subscribe(res =>{
        this.users = res.filter(p => p.id != this.user.id);
        this.users.forEach(user => {
            user.newMessageCount = 0;
        });
    })
  }
  changeUser(user: UserModel){
    this.search = "";
    this.selectedUserId = user.id;
    this.selectedUser = user;
    const url = `https://localhost:7056/api/Chats/GetChats?userId=${this.user.id}&toUserId=${this.selectedUser.id}`;
    this.http.get(url).subscribe((res : any) => {
    this.chats = res;
   });
  }

  sendMessage(){
    if(!this.message){return;}
    const data = {
      "userId":this.user.id,
      "toUserId":this.selectedUser.id,
      "message":this.message
    };
    this.http.post<ChatModel>("https://localhost:7056/api/Chats/SendMessage",data).subscribe((res) =>{
      this.chats.push(res);
      this.message = "";
    })
  }
  logout(){
   localStorage.removeItem("acessToken");
   document.location.reload();
  }
}




