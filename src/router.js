import Vue from 'vue';
import Router from 'vue-router';
import state from './state';

Vue.use(Router);

let preauth = true;

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/interview/:id',
      name: 'interview',
      component: () => { return import('./views/Interview.vue'); }
    }, {
      path: '/signin',
      name: 'signin',
      component: () => { return import('./views/SignIn.vue'); }
    }, {
      path: '/dashboard',
      name: 'dashboard',
      alias: '/',
      component: () => { return import('./views/Dashboard.vue'); }
    }
  ]
});

router.beforeEach((to, from, next) => {
  if (to.name === 'interview') {
    return next();
  }

  if (preauth) {
    return router.app.$api.get('/session').
      then((response) => {
        router.app.$session(response.data);
        preauth = false;

        if (to.name === 'signin') {
          return next({ name: 'dashboard' });
        }
        return next();
      }).
      catch(() => {
        preauth = false;
        return next({ name: 'signin' });
      });
  }

  if (!state.session && to.name !== 'signin') {
    return next({ name: 'signin' });
  } else if (state.session && to.name === 'signin') {
    return next({ name: 'dashboard' });
  }

  return next();
});

export default router;
