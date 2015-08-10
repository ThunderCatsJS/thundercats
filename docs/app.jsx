import React, { PropTypes } from 'react';
import StyleSheet from 'react-style';
import {
  AppBar,
  Overlay,
  SideNavigation,
  List,
  ListItem
} from 'react-material';
import urls from './constants/urls.json';
import { logoColor } from './shared/Colors';

const AppStyles = StyleSheet.create({
  normalAppBarStyle: {
    backgroundColor: logoColor
  }
});

export default class extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showSideNavigation: false
    };
  }

  static displayName = 'App'
  static propTypes = {
    children: PropTypes.node,
    location: PropTypes.object
  }

  handleNavButtonClick() {
    this.setState({
      showSideNavigation: true
    });
  }

  handleOverlayClick() {
    this.setState({
      showSideNavigation: false
    });
  }

  goToExternal(url) {
    const location = typeof window !== 'undefined' ?
      window.location :
      { };
    return () => {
      location.href = url;
    };
  }

  render() {
    const {
      showSideNavigation
    } = this.state;

    return (
      <div>
        <AppBar
          onNavButtonClick={ ::this.handleNavButtonClick }
          styles={ AppStyles }
          title={ 'ThunderCats.js'} />
        <Overlay
          onClick={ ::this.handleOverlayClick }
          show={ showSideNavigation } />
        { this.props.children || 'Welcome Thunderians' }
        <SideNavigation show={ showSideNavigation }>
          <List>
            <ListItem onClick={ this.goToExternal(urls.rxjs) }>
              RxJS
            </ListItem>
            <ListItem onClick={ this.goToExternal(urls.react) }>
              React.js
            </ListItem>
            <ListItem onClick={ this.goToExternal(urls.flux) }>
              Flux
            </ListItem>
            <ListItem onClick={ this.goToExternal(urls.source) }>
              Source
            </ListItem>
            <ListItem onClick={ this.goToExternal(urls.logo) }>
              Logo Credits: <br>Lenore Messler</br>
            </ListItem>
          </List>
        </SideNavigation>
      </div>
    );
  }
}
