import { Actions } from 'thundercats';

export default class RouterActions extends Actions {
  constructor() {
    super();
  }

  static displayName = 'RouterActions'

  changeRoute(newRoute) {
    return {
      set: {
        currentRoute: newRoute
      }
    };
  }
}
