import React, { Component } from 'react';
import * as perspective from 'perspective-api';
import './Graph.css';
import { ServerRespond } from './DataStreamer';

interface IProps {
  data: ServerRespond[];
}

interface IState {
  price: number,
  data: ServerRespond[],
  rows: any[],
}

interface PerspectiveViewerElement extends HTMLElement {
  load: (table: Table) => void,
}

interface Table {
  update: (data: any[]) => void,
}

class Graph extends Component<IProps, IState> {
  perspectiveElement: PerspectiveViewerElement | null;

  constructor(props: IProps) {
    super(props);

    this.state = {
      price: 0,
      data: [],
      rows: [],
    };

    this.perspectiveElement = null;
  }

  componentDidMount() {
    const elem = document.getElementsByTagName('perspective-viewer')[0];
    this.perspectiveElement = elem as unknown as PerspectiveViewerElement;
    this.perspectiveElement.setAttribute('view', 'y_line');
    this.perspectiveElement.setAttribute('column-pivots', '["timestamp"]');
    this.perspectiveElement.setAttribute('columns', '["ratio", "lower_bound", "upper_bound", "trigger_alert"]');
    this.perspectiveElement.setAttribute('aggregates', `
      {"ratio": "custom.sum(price_abc, price_def)", 
      "lower_bound": "custom.lower_bound(ratio)", 
      "upper_bound": "custom.upper_bound(ratio)", 
      "trigger_alert": "custom.trigger_alert(lower_bound, ratio, upper_bound)"}
    `);
  }

  componentDidUpdate() {
    if (this.perspectiveElement && this.state.rows.length > 0) {
      this.perspectiveElement.load(this.state.rows);
    }
  }

  static formatData(serverResponds: ServerRespond[]): {timestamp: Date, stockPrices: {[key: string]: number}}[] {
    const priceData: {timestamp: Date, stockPrices: {[key: string]: number}}[] = [];
    let stockPrices: {[key: string]: number} = {};

    for (const serverRespond of serverResponds) {
      const timestamp = new Date(serverRespond.timestamp);
      const key = serverRespond.stock;
      stockPrices[key] = serverRespond.price;

      priceData.push({timestamp, stockPrices});
    }

    return priceData;
  }

  getDataFromServer = () => {
    const { data } = this.props;
    const dataFormated = Graph.formatData(data);

    const rows = dataFormated.map((value, index) => {
      const price_abc = value.stockPrices['ABC'];
      const price_def = value.stockPrices['DEF'];
      return Object.assign({}, {'index': index, 'price_abc': price_abc, 'price_def': price_def}, value.stockPrices, {'ratio': (price_abc && price_def) ? price_def / price_abc : 0});
    });

    this.setState({
      price: dataFormated[dataFormated.length - 1].stockPrices['AAPL'],
      data: dataFormated,
      rows: rows,
    });
  }

  render() {
    return (
      <div className="Graph">
        <perspective-viewer id="viewer"></perspective-viewer>
        <div className="price">
          <h4>AAPL: {this.state.price}</h4>
        </div>
      </div>
    );
  }
}

export default Graph;
