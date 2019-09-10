import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/interview/:id',
      name: 'interview',
      component: () => { return import('./views/Interview.vue'); }
    }, {
      path: '/login',
      name: 'login',
      component: () => { return import('./views/Login.vue'); }
    }, {
      path: '/dashboard',
      name: 'dashboard',
      component: () => { return import('./views/Dashboard.vue'); }
    }
  ]
});
