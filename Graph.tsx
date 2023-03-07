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

interface Row {
  price_abc: number,
  price_def: number,
  ratio: number,
  timestamp: Date,
  upper_bound: number,
  lower_bound: number,
  trigger_alert: string | undefined, // Modified to accept undefined value
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

    const schema = {
      stock: 'string',
      timestamp: 'date',
      price_abc: 'float',
      price_def: 'float',
      ratio: 'float',
      upper_bound: 'float',
      lower_bound: 'float',
      trigger_alert: 'string',
    };

    this.perspectiveElement.setAttribute('view', 'y_line');
    this.perspectiveElement.setAttribute('column-pivots', '["timestamp"]');
    this.perspectiveElement.setAttribute('columns', '["ratio", "lower_bound", "upper_bound", "trigger_alert"]');
    this.perspectiveElement.setAttribute('aggregates', `
      {"stock": "distinct count",
       "timestamp": "distinct count",
       "price_abc": "avg",
       "price_def": "avg",
       "ratio": "avg",
       "upper_bound": "avg",
       "lower_bound": "avg",
       "trigger_alert": "distinct count"}
    `);
    this.perspectiveElement.setAttribute('row-pivots', '["stock"]');
    this.perspectiveElement.setAttribute('data-schema', JSON.stringify(schema));
  }

  componentDidUpdate(prevProps: IProps, prevState: IState) {
    if (this.perspectiveElement && this.state.rows.length > 0) {
      const newData = this.state.rows.slice(prevState.rows.length, this.state.rows.length);
      this.perspectiveElement.load(newData);
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
    const priceABC = (value.stockPrices['ABC'] + value.stockPrices['ABCD']) / 2;
    const priceDEF = (value.stockPrices['DEF'] + value.stockPrices['DEFG']) / 2;
    const ratio = priceABC / priceDEF;

    const upperBound = 1.1 * (rows.slice(0, index).reduce((acc, row) => acc + row.ratio, 0) / index);
    const lowerBound = 0.9 * (rows.slice(0, index).reduce((acc, row) => acc + row.ratio, 0) / index);

    return {
      ...value.stockPrices,
      timestamp: value.timestamp,
      price_abc: priceABC,
      price_def: priceDEF,
      ratio,
      upper_bound: upperBound,
      lower_bound: lowerBound,
      trigger_alert:
        ratio >= upperBound || ratio <= lowerBound ? 'crossed' : '',
    };
  });

  this.setState({
    rows,
  });
}

                         
